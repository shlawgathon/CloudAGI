import { readFile } from "node:fs/promises";
import { config, requireAdminKey } from "./config";
import { startOrderJob } from "./jobs/runner";
import { orderStore } from "./orders/store";
import type { CreateOrderInput } from "./orders/types";
import {
  buildPaymentRequirement,
  getPlanMetadata,
  isNeverminedConfigured,
  settleAccessToken,
  verifyAccessToken
} from "./payments/nevermined";

const corsHeaders = {
  "Access-Control-Allow-Origin": config.corsOrigin,
  "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE, payment-signature, x-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {})
    }
  });
}

function text(data: string, init?: ResponseInit): Response {
  return new Response(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {})
    }
  });
}

async function parseJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

function validateOrderInput(body: Partial<CreateOrderInput>): string | null {
  if (!body.customerName?.trim()) return "customerName is required";
  if (!body.contact?.trim()) return "contact is required";
  if (!body.jobType) return "jobType is required";
  if (!body.command || !Array.isArray(body.command) || body.command.length === 0) {
    return "command must be a non-empty string array";
  }
  if (!body.expectedOutput?.trim()) return "expectedOutput is required";
  if (!body.inputNotes?.trim()) return "inputNotes is required";
  return null;
}

function getAccessToken(req: Request): string | null {
  return req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature");
}

function getPublicBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (forwardedHost) {
    return `${url.protocol}//${forwardedHost}`;
  }

  return url.origin;
}

function paymentRequiredResponse(endpoint: string, method: string, message: string): Response {
  const paymentRequired = buildPaymentRequirement(endpoint, method);

  return json(
    {
      error: message,
      paymentRequired
    },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequired)).toString("base64")
      }
    }
  );
}

async function handleCreateOrder(req: Request): Promise<Response> {
  const body = await parseJson<Partial<CreateOrderInput>>(req);
  const validationError = validateOrderInput(body);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const order = orderStore.create(
    body as CreateOrderInput,
    config.priceUsdc,
    isNeverminedConfigured() ? getPlanMetadata() : undefined
  );

  return json(
    {
      order,
      payment: isNeverminedConfigured()
        ? {
            type: "nevermined-x402",
            ...getPlanMetadata(),
            instructions:
              "Order the plan in Nevermined with USDC, generate an x402 access token, then call POST /v1/orders/:id/start with PAYMENT-SIGNATURE."
          }
        : {
            type: "not-configured",
            instructions:
              "Nevermined is not configured yet. Set NVM_API_KEY, NVM_AGENT_ID, and NVM_PLAN_ID."
          }
    },
    { status: 201 }
  );
}

async function handleGetOrder(orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  return json({ order });
}

async function handleListOrders(req: Request): Promise<Response> {
  if (!requireAdminKey(req)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  return json({ orders: orderStore.list() });
}

async function handleStartOrder(req: Request, orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (!isNeverminedConfigured()) {
    return json({ error: "Nevermined is not configured" }, { status: 503 });
  }

  const accessToken = getAccessToken(req);
  const endpoint = `/v1/orders/${orderId}/start`;

  if (!accessToken) {
    return paymentRequiredResponse(
      endpoint,
      "POST",
      "Payment required. Send a valid x402 access token in PAYMENT-SIGNATURE."
    );
  }

  let verification;
  try {
    verification = await verifyAccessToken(accessToken, endpoint, "POST", 1n);
  } catch (error) {
    console.error("Nevermined verification failed", error);
    return paymentRequiredResponse(
      endpoint,
      "POST",
      "Payment verification failed. Confirm the subscriber account has ordered the plan and mint a fresh x402 token for this plan."
    );
  }

  if (!verification.isValid) {
    return paymentRequiredResponse(
      endpoint,
      "POST",
      verification.invalidReason ||
        "Payment required. Order the plan and send a fresh x402 token for this endpoint."
    );
  }

  let settlement;
  try {
    settlement = await settleAccessToken(accessToken, endpoint, "POST", 1n);
  } catch (error) {
    console.error("Nevermined settlement failed", error);
    return paymentRequiredResponse(
      endpoint,
      "POST",
      "Payment settlement failed. Re-check plan balance and mint a fresh x402 token before retrying."
    );
  }

  void startOrderJob(orderId);

  return json({
    ok: true,
    orderId,
    status: "running",
    payment: {
      success: settlement.success,
      transaction: settlement.transaction,
      creditsRedeemed: settlement.creditsRedeemed
    }
  });
}

async function handleOrderLogs(orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  return text(order.logs, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}

async function handleOrderArtifacts(orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  return json({ artifacts: order.artifacts });
}

async function handleDownloadArtifact(orderId: string, artifactName: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  const artifact = order.artifacts.find((item) => item.name === artifactName);
  if (!artifact) {
    return json({ error: "Artifact not found" }, { status: 404 });
  }

  const body = await readFile(artifact.path);
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "content-type": artifact.contentType,
      "content-disposition": `attachment; filename="${artifact.name}"`
    }
  });
}

async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (path === "/" && req.method === "GET") {
    return json({
      service: config.appName,
      version: config.version,
      message: "CloudAGI API server. Use the Next.js frontend in /web for the UI."
    });
  }

  if (path === "/.well-known/agent.json" && req.method === "GET") {
    const baseUrl = getPublicBaseUrl(req);

    return json({
      name: config.offerName,
      version: config.version,
      description:
        "CloudAGI is a paid GPU execution service that runs AI jobs on Modal and returns logs plus artifacts.",
      endpoints: {
        createOrder: `${baseUrl}/v1/orders`,
        startOrder: `${baseUrl}/v1/orders/{orderId}/start`,
        getOrder: `${baseUrl}/v1/orders/{orderId}`,
        getLogs: `${baseUrl}/v1/orders/{orderId}/logs`,
        getArtifacts: `${baseUrl}/v1/orders/{orderId}/artifacts`
      },
      payment: isNeverminedConfigured()
        ? {
            type: "nevermined-x402",
            ...getPlanMetadata()
          }
        : {
            type: "not-configured"
          }
    });
  }

  if (path === "/v1/health" && req.method === "GET") {
    return json({
      status: "ok",
      service: config.appName,
      version: config.version,
      neverminedConfigured: isNeverminedConfigured()
    });
  }

  if (path === "/v1/orders" && req.method === "POST") {
    return handleCreateOrder(req);
  }

  if (path === "/v1/orders" && req.method === "GET") {
    return handleListOrders(req);
  }

  const orderMatch = path.match(/^\/v1\/orders\/([^/]+)$/);
  if (orderMatch && req.method === "GET") {
    return handleGetOrder(orderMatch[1]);
  }

  const startMatch = path.match(/^\/v1\/orders\/([^/]+)\/start$/);
  if (startMatch && req.method === "POST") {
    return handleStartOrder(req, startMatch[1]);
  }

  const logsMatch = path.match(/^\/v1\/orders\/([^/]+)\/logs$/);
  if (logsMatch && req.method === "GET") {
    return handleOrderLogs(logsMatch[1]);
  }

  const artifactsMatch = path.match(/^\/v1\/orders\/([^/]+)\/artifacts$/);
  if (artifactsMatch && req.method === "GET") {
    return handleOrderArtifacts(artifactsMatch[1]);
  }

  const artifactDownloadMatch = path.match(/^\/v1\/orders\/([^/]+)\/artifacts\/([^/]+)$/);
  if (artifactDownloadMatch && req.method === "GET") {
    return handleDownloadArtifact(artifactDownloadMatch[1], artifactDownloadMatch[2]);
  }

  return json({ error: "Not found" }, { status: 404 });
}

const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  fetch: router
});

console.log(`${config.appName} running at ${server.url}`);
