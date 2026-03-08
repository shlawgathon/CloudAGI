import { readFile } from "node:fs/promises";
import { config, requireAdminKey } from "./config";
import {
  executeTrinityStep,
  finalizeTrinityRun,
  recordTrinityStepCallback,
  startOrderJob
} from "./jobs/runner";
import { orderStore } from "./orders/store";
import type { CreateAgentOrderInput, CreateOrderInput } from "./orders/types";
import { isTrinityConfigured } from "./orchestration/trinity";
import {
  buildPaymentRequirement,
  getPlanMetadata,
  isNeverminedConfigured,
  settleAccessToken,
  verifyAccessToken
} from "./payments/nevermined";
import "./services/init";
import {
  getAllServices,
  getRegisteredService,
  getServicePublicInfo,
  serviceRegistry
} from "./services/registry";
import { discoverBuyers, discoverSellers } from "./discovery/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": config.corsOrigin,
  "Access-Control-Allow-Headers":
    "Content-Type, PAYMENT-SIGNATURE, payment-signature, x-admin-key, x-trinity-shared-secret, x-order-token",
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

function splitCommand(value: string): string[] {
  return (
    value
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((part) => part.replace(/^"|"$/g, ""))
      .filter(Boolean) ?? []
  );
}

function normalizeCommand(command?: string[] | string): string[] {
  if (Array.isArray(command)) {
    return command.map((part) => part.trim()).filter(Boolean);
  }

  if (typeof command === "string") {
    return splitCommand(command.trim());
  }

  return [];
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

function mapAgentOrderInput(body: Partial<CreateAgentOrderInput>): CreateOrderInput | string {
  const agentName = body.agentName?.trim();
  const agentId = body.agentId?.trim();
  const contact = body.contact?.trim();
  const command = normalizeCommand(body.command);
  const inputNotes = body.inputNotes?.trim() || body.objective?.trim();

  if (!agentName && !agentId) {
    return "agentName or agentId is required";
  }

  if (command.length === 0) {
    return "command must be a non-empty string or string array";
  }

  if (!inputNotes) {
    return "inputNotes or objective is required";
  }

  if (!body.expectedOutput?.trim()) {
    return "expectedOutput is required";
  }

  return {
    customerName: agentName || agentId || "Autonomous agent",
    contact: contact || (agentId ? `agent:${agentId}` : `agent:${agentName}`),
    jobType: body.jobType || "custom",
    repoUrl: body.repoUrl?.trim() || undefined,
    command,
    inputNotes,
    expectedOutput: body.expectedOutput.trim()
  };
}

function getAccessToken(req: Request): string | null {
  return req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature");
}

function hasValidTrinitySecret(req: Request): boolean {
  return Boolean(
    config.trinity.sharedSecret &&
      req.headers.get("x-trinity-shared-secret") === config.trinity.sharedSecret
  );
}

function getCanonicalBaseUrl(): string {
  return config.appBaseUrl.replace(/\/+$/, "");
}

function getOrderReadToken(req: Request): string | null {
  const url = new URL(req.url);
  return req.headers.get("x-order-token") || url.searchParams.get("token");
}

function withOrderToken(url: string, readToken: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("token", readToken);
  return parsed.toString();
}

function canReadOrder(req: Request, orderId: string): boolean {
  if (requireAdminKey(req)) {
    return true;
  }

  const order = orderStore.get(orderId);
  if (!order?.readToken) {
    return false;
  }

  return getOrderReadToken(req) === order.readToken;
}

function sanitizeOrder<T extends { accessToken?: string; readToken?: string }>(order: T): Omit<T, "accessToken" | "readToken"> {
  const { accessToken: _accessToken, readToken: _readToken, ...safeOrder } = order;
  return safeOrder;
}

async function paymentRequiredResponse(
  endpoint: string,
  method: string,
  message: string,
  planId?: string,
  agentId?: string
): Promise<Response> {
  const paymentRequired = await buildPaymentRequirement(endpoint, method, planId, agentId);

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

function buildOrderCreationResponse(orderId: string) {
  const order = orderStore.get(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const baseUrl = getCanonicalBaseUrl();

  return {
    order: sanitizeOrder(order),
    readToken: order.readToken,
    payment: isNeverminedConfigured()
      ? {
          type: "nevermined-x402",
          ...getPlanMetadata(),
          instructions:
            config.nevermined.paymentRail === "fiat"
              ? "Order the plan in Nevermined with Stripe-backed fiat checkout, generate an x402 access token, then call POST /v1/orders/:id/start with PAYMENT-SIGNATURE."
              : "Order the plan in Nevermined with crypto, generate an x402 access token, then call POST /v1/orders/:id/start with PAYMENT-SIGNATURE."
        }
      : {
          type: "not-configured",
          instructions:
            "Nevermined is not configured yet. Set NVM_API_KEY, NVM_AGENT_ID, and NVM_PLAN_ID."
        },
    links: {
      order: withOrderToken(`${baseUrl}/v1/orders/${order.id}`, order.readToken),
      start: `${baseUrl}/v1/orders/${order.id}/start`,
      logs: withOrderToken(`${baseUrl}/v1/orders/${order.id}/logs`, order.readToken),
      artifacts: withOrderToken(`${baseUrl}/v1/orders/${order.id}/artifacts`, order.readToken)
    }
  };
}

async function handleCreateOrder(req: Request): Promise<Response> {
  const body = await parseJson<Partial<CreateOrderInput>>(req);
  const validationError = validateOrderInput(body);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const order = orderStore.create(
    body as CreateOrderInput,
    config.offerPriceLabel,
    isNeverminedConfigured() ? getPlanMetadata() : undefined
  );

  return json(buildOrderCreationResponse(order.id), { status: 201 });
}

async function handleCreateAgentOrder(req: Request): Promise<Response> {
  const body = await parseJson<Partial<CreateAgentOrderInput>>(req);
  const normalized = mapAgentOrderInput(body);

  if (typeof normalized === "string") {
    return json({ error: normalized }, { status: 400 });
  }

  const validationError = validateOrderInput(normalized);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const order = orderStore.create(
    normalized,
    config.offerPriceLabel,
    isNeverminedConfigured() ? getPlanMetadata() : undefined
  );

  return json(
    {
      ...buildOrderCreationResponse(order.id),
      requestedBy: {
        agentName: body.agentName?.trim() || null,
        agentId: body.agentId?.trim() || null
      }
    },
    { status: 201 }
  );
}

async function handleGetOrder(req: Request, orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (!canReadOrder(req, orderId)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  return json({ order: sanitizeOrder(order), compute: order.compute });
}

async function handleListOrders(req: Request): Promise<Response> {
  if (!requireAdminKey(req)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  return json({ orders: orderStore.list().map((order) => sanitizeOrder(order)) });
}

async function handleStartOrder(req: Request, orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "awaiting_payment") {
    if (!canReadOrder(req, orderId)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    return json({
      ok: true,
      orderId,
      status: order.status,
      orchestration: order.orchestration
    });
  }

  if (!isNeverminedConfigured()) {
    return json({ error: "Nevermined is not configured" }, { status: 503 });
  }

  if (!isTrinityConfigured()) {
    return json({ error: "Trinity is not configured" }, { status: 503 });
  }

  const accessToken = getAccessToken(req);
  const endpoint = `/v1/orders/${orderId}/start`;

  if (!accessToken) {
    return await paymentRequiredResponse(
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
    return await paymentRequiredResponse(
      endpoint,
      "POST",
      config.nevermined.paymentRail === "fiat"
        ? "Payment verification failed. Confirm the subscriber account completed the Nevermined Stripe checkout and minted a fresh x402 token for this plan."
        : "Payment verification failed. Confirm the subscriber account has ordered the plan and mint a fresh x402 token for this plan."
    );
  }

  if (!verification.isValid) {
    return await paymentRequiredResponse(
      endpoint,
      "POST",
      verification.invalidReason ||
        "Payment required. Order the plan and send a fresh x402 token for this endpoint."
    );
  }

  try {
    await settleAccessToken(accessToken, endpoint, "POST", 1n);
  } catch (error) {
    console.error("Nevermined settlement failed", error);
    return await paymentRequiredResponse(
      endpoint,
      "POST",
      config.nevermined.paymentRail === "fiat"
        ? "Payment settlement failed. Re-check the Nevermined Stripe-backed plan purchase and mint a fresh x402 token before retrying."
        : "Payment settlement failed. Re-check plan balance and mint a fresh x402 token before retrying."
    );
  }

  // Stash the access token on the order for per-step settlement
  orderStore.stashAccessToken(orderId, accessToken);

  // Initialize compute summary with requested GPU hours
  const gpuHours = order.gpuHours || 1;
  orderStore.update(orderId, {
    compute: {
      totalDurationMs: 0,
      totalCreditsUsed: 0,
      gpuHoursRequested: gpuHours
    }
  });

  let nextOrder;
  try {
    nextOrder = await startOrderJob(orderId, getCanonicalBaseUrl());
  } catch (error) {
    console.error("Trinity trigger failed", error);
    return json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }

  return json({
    ok: true,
    orderId,
    status: nextOrder.status,
    orchestration: nextOrder.orchestration,
    compute: nextOrder.compute,
    payment: { success: true }
  });
}

async function handleOrderLogs(req: Request, orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (!canReadOrder(req, orderId)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  return text(order.logs, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}

async function handleOrderArtifacts(req: Request, orderId: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (!canReadOrder(req, orderId)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  return json({ artifacts: order.artifacts });
}

async function handleDownloadArtifact(req: Request, orderId: string, artifactName: string): Promise<Response> {
  const order = orderStore.get(orderId);
  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  if (!canReadOrder(req, orderId)) {
    return json({ error: "Forbidden" }, { status: 403 });
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

async function handleInternalExecuteStep(req: Request): Promise<Response> {
  if (!hasValidTrinitySecret(req)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseJson<{
    orderId: string;
    runId: string;
    stepId: string;
    role: "gpu-compute" | "ai-research" | "web-scraper" | "code-review" | "smart-search";
  }>(req);

  const execution = await executeTrinityStep(body);
  return json({
    ok: true,
    execution
  });
}

async function handleInternalStepCallback(req: Request): Promise<Response> {
  if (!hasValidTrinitySecret(req)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseJson<{
    orderId: string;
    runId: string;
    stepId: string;
    role: "gpu-compute" | "ai-research" | "web-scraper" | "code-review" | "smart-search";
    status: "succeeded" | "failed";
    message?: string;
  }>(req);

  const order = recordTrinityStepCallback(body);
  return json({
    ok: true,
    order
  });
}

async function handleInternalFinalizeRun(req: Request): Promise<Response> {
  if (!hasValidTrinitySecret(req)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseJson<{
    orderId: string;
    runId: string;
    status: "succeeded" | "failed" | "canceled";
  }>(req);

  const order = finalizeTrinityRun(body);
  return json({
    ok: true,
    order
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
    const baseUrl = getCanonicalBaseUrl();

    const inputSchemas: Record<string, object> = {
      "gpu-compute": {
        type: "object",
        required: ["command"],
        properties: {
          command: { type: "array", items: { type: "string" }, description: "Command to execute" },
          gpu: { type: "string", enum: ["none", "T4", "A10G", "A100", "H100"], default: "none" },
          image: { type: "string", default: "python:3.13" },
          timeoutSecs: { type: "number", default: 1800 },
        },
      },
      "ai-research": {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Natural language search query" },
          numResults: { type: "number", default: 5 },
          type: { type: "string", enum: ["auto", "neural", "keyword"], default: "auto" },
        },
      },
      "web-scraper": {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to scrape" },
          actorId: { type: "string", description: "Apify actor ID (alternative to url)" },
          maxPages: { type: "number", default: 1 },
        },
      },
      "code-review": {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string", description: "Code to review" },
          language: { type: "string", default: "typescript" },
          focus: { type: "array", items: { type: "string" }, default: ["bugs", "security", "performance"] },
        },
      },
      "smart-search": {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query" },
          numResults: { type: "number", default: 5 },
          sources: { type: "array", items: { type: "string" }, default: ["exa"] },
        },
      },
      "apify-skills": {
        type: "object",
        required: ["skill"],
        properties: {
          skill: {
            type: "string",
            enum: [
              "ultimate-scraper",
              "market-research",
              "lead-generation",
              "competitor-intelligence",
              "trend-analysis",
              "content-analytics",
              "brand-monitoring",
              "influencer-discovery",
            ],
            description: "Which Apify skill to invoke",
          },
          url: { type: "string", description: "Target URL (for scraper, lead-gen, competitor, content skills)" },
          urls: { type: "array", items: { type: "string" }, description: "Multiple target URLs" },
          query: { type: "string", description: "Search query (for market-research)" },
          brand: { type: "string", description: "Brand name (for brand-monitoring)" },
          niche: { type: "string", description: "Niche topic (for influencer-discovery)" },
          term: { type: "string", description: "Trend search term (for trend-analysis)" },
          terms: { type: "array", items: { type: "string" }, description: "Multiple trend search terms" },
          platform: { type: "string", description: "Social platform (for influencer-discovery)", default: "instagram" },
          maxPages: { type: "number", description: "Max pages to crawl", default: 5 },
          numResults: { type: "number", description: "Number of results to return", default: 20 },
        },
      },
      orchestrator: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["orchestrate", "delegate"],
            default: "orchestrate"
          },
          serviceId: {
            type: "string",
            description: "Leaf service id to call when mode=delegate"
          },
          serviceInput: {
            type: "object",
            description: "Payload forwarded to the delegated leaf agent"
          },
          agentName: { type: "string" },
          agentId: { type: "string" },
          contact: { type: "string" },
          jobType: { type: "string", enum: ["inference", "eval", "batch", "custom"] },
          repoUrl: { type: "string" },
          command: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } }
            ]
          },
          objective: { type: "string" },
          inputNotes: { type: "string" },
          expectedOutput: { type: "string" },
          gpuHours: { type: "number", default: 1 }
        }
      }
    };

    const services = getAllServices().map((s) => {
      const registered = getRegisteredService(s.id);
      return {
        ...getServicePublicInfo(s),
        executeUrl: `${baseUrl}/v1/services/${s.id}/execute`,
        agentId: registered?.agentId || undefined,
        planId: registered?.planId || undefined,
        instructions: `POST ${baseUrl}/v1/services/${s.id}/execute with JSON body. Include x402 PAYMENT-SIGNATURE header for paid access.`,
        inputSchema: inputSchemas[s.id] || undefined,
      };
    });

    return json({
      name: "CloudAGI",
      author: "CloudAGI",
      version: config.version,
      description:
        "CloudAGI is a multi-service AI cloud platform with a branch orchestrator plus leaf agents for GPU compute, neural search, web scraping, AI code review, and smart search. All services are paid via Nevermined x402 protocol.",
      url: baseUrl,
      services,
      endpoints: {
        catalog: `${baseUrl}/v1/services`,
        createOrder: `${baseUrl}/v1/orders`,
        createAgentOrder: `${baseUrl}/v1/agent/orders`,
        startOrder: `${baseUrl}/v1/orders/{orderId}/start`,
        getOrder: `${baseUrl}/v1/orders/{orderId}`,
        getLogs: `${baseUrl}/v1/orders/{orderId}/logs`,
        getArtifacts: `${baseUrl}/v1/orders/{orderId}/artifacts`,
        discover: `${baseUrl}/v1/discover/sellers`
      },
      schemas: {
        createAgentOrder: {
          agentName: "string (optional if agentId is present)",
          agentId: "string (optional if agentName is present)",
          contact: "string (optional)",
          jobType: "inference | eval | batch | custom",
          repoUrl: "string (optional)",
          command: "string[] | string",
          objective: "string (optional, used as inputNotes fallback)",
          inputNotes: "string (optional if objective is provided)",
          expectedOutput: "string",
          gpuHours: "number (optional, default 1). 1 credit = 1 GPU-minute"
        }
      },
      payment: isNeverminedConfigured()
        ? {
            type: "nevermined-x402",
            ...getPlanMetadata()
          }
        : {
            type: "not-configured"
          },
      capabilities: {
        a2a: true,
        x402: true,
        services: services.length
      }
    });
  }

  if (path === "/v1/health" && req.method === "GET") {
    return json({
      status: "ok",
      service: config.appName,
      version: config.version,
      neverminedConfigured: isNeverminedConfigured(),
      trinityConfigured: isTrinityConfigured()
    });
  }

  if (path === "/v1/orders" && req.method === "POST") {
    return handleCreateOrder(req);
  }

  if (path === "/v1/agent/orders" && req.method === "POST") {
    return handleCreateAgentOrder(req);
  }

  if (path === "/v1/orders" && req.method === "GET") {
    return handleListOrders(req);
  }

  const orderMatch = path.match(/^\/v1\/orders\/([^/]+)$/);
  if (orderMatch && req.method === "GET") {
    return handleGetOrder(req, orderMatch[1]);
  }

  const startMatch = path.match(/^\/v1\/orders\/([^/]+)\/start$/);
  if (startMatch && req.method === "POST") {
    return handleStartOrder(req, startMatch[1]);
  }

  const logsMatch = path.match(/^\/v1\/orders\/([^/]+)\/logs$/);
  if (logsMatch && req.method === "GET") {
    return handleOrderLogs(req, logsMatch[1]);
  }

  const artifactsMatch = path.match(/^\/v1\/orders\/([^/]+)\/artifacts$/);
  if (artifactsMatch && req.method === "GET") {
    return handleOrderArtifacts(req, artifactsMatch[1]);
  }

  const artifactDownloadMatch = path.match(/^\/v1\/orders\/([^/]+)\/artifacts\/([^/]+)$/);
  if (artifactDownloadMatch && req.method === "GET") {
    return handleDownloadArtifact(req, artifactDownloadMatch[1], artifactDownloadMatch[2]);
  }

  // --- Service catalog routes ---

  if (path === "/v1/services" && req.method === "GET") {
    return json({
      services: getAllServices().map(getServicePublicInfo),
      total: serviceRegistry.size,
    });
  }

  const serviceInfoMatch = path.match(/^\/v1\/services\/([^/]+)$/);
  if (serviceInfoMatch && req.method === "GET") {
    const svc = getRegisteredService(serviceInfoMatch[1]);
    if (!svc) return json({ error: "Service not found" }, { status: 404 });
    return json({
      ...getServicePublicInfo(svc),
      agentId: svc.agentId || undefined,
      planId: svc.planId || undefined,
    });
  }

  const serviceExecMatch = path.match(/^\/v1\/services\/([^/]+)\/execute$/);
  if (serviceExecMatch && req.method === "POST") {
    const serviceId = serviceExecMatch[1];
    const svc = getRegisteredService(serviceId);
    if (!svc) return json({ error: "Service not found" }, { status: 404 });

    // x402 payment gate (if Nevermined is configured and service has a plan)
    if (isNeverminedConfigured() && svc.planId) {
      const accessToken = getAccessToken(req);
      const endpoint = `/v1/services/${serviceId}/execute`;
      const sPlanId = svc.planId;
      const sAgentId = svc.agentId;

      if (!accessToken) {
        return await paymentRequiredResponse(
          endpoint,
          "POST",
          `Payment required for ${svc.name}. Send a valid x402 access token in PAYMENT-SIGNATURE.`,
          sPlanId,
          sAgentId
        );
      }

      try {
        const verification = await verifyAccessToken(accessToken, endpoint, "POST", 1n, sPlanId, sAgentId);
        if (!verification.isValid) {
          return await paymentRequiredResponse(
            endpoint,
            "POST",
            verification.invalidReason || "Invalid payment token.",
            sPlanId,
            sAgentId
          );
        }
        await settleAccessToken(accessToken, endpoint, "POST", 1n, sPlanId, sAgentId);
      } catch {
        return await paymentRequiredResponse(
          endpoint,
          "POST",
          "Payment verification failed.",
          sPlanId,
          sAgentId
        );
      }
    }

    const body = await parseJson<Record<string, unknown>>(req);
    const result = await svc.handler(body, {
      accessToken: getAccessToken(req) || undefined,
      baseUrl: getCanonicalBaseUrl(),
      endpoint: `/v1/services/${serviceId}/execute`,
      method: "POST",
      service: svc
    });
    return json(result, { status: result.success ? 200 : 422 });
  }

  // --- Discovery routes ---

  if (path === "/v1/discover/sellers" && req.method === "GET") {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const sellers = await discoverSellers(category);
    return json({ sellers, total: sellers.length });
  }

  if (path === "/v1/discover/buyers" && req.method === "GET") {
    const buyers = await discoverBuyers();
    return json({ buyers, total: buyers.length });
  }

  // --- Internal Trinity routes ---

  if (path === "/internal/trinity/execute-step" && req.method === "POST") {
    return handleInternalExecuteStep(req);
  }

  if (path === "/internal/trinity/step-callback" && req.method === "POST") {
    return handleInternalStepCallback(req);
  }

  if (path === "/internal/trinity/finalize-run" && req.method === "POST") {
    return handleInternalFinalizeRun(req);
  }

  return json({ error: "Not found" }, { status: 404 });
}

const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  fetch: router
});

console.log(`${config.appName} running at ${server.url}`);
