/**
 * buy-from-marketplace.ts
 *
 * Purchaser agent for CloudAGI — discovers sellers on the Nevermined hackathon
 * marketplace, orders their plan, obtains an x402 access token, calls their
 * endpoint, and prints the result.
 *
 * Usage:
 *   NVM_API_KEY=... bun run src/scripts/buy-from-marketplace.ts
 *   NVM_API_KEY=... bun run src/scripts/buy-from-marketplace.ts --filter gpu
 *   NVM_API_KEY=... bun run src/scripts/buy-from-marketplace.ts --plan-id <id> --agent-id <id> --url <url> --message "hello"
 */

import { Payments } from "@nevermined-io/payments";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NVM_API_KEY = process.env.NVM_API_KEY;
if (!NVM_API_KEY) {
  console.error("ERROR: NVM_API_KEY environment variable is required.");
  process.exit(1);
}

const NVM_ENVIRONMENT = (process.env.NVM_ENVIRONMENT || "sandbox") as never;
const HACKATHON_DISCOVER_URL =
  process.env.HACKATHON_DISCOVER_URL ||
  "https://nevermined.ai/hackathon/register/api/discover?side=sell";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPayments(): Payments {
  return Payments.getInstance({
    nvmApiKey: NVM_API_KEY!,
    environment: NVM_ENVIRONMENT,
  });
}

interface Seller {
  name?: string;
  description?: string;
  agentId?: string;
  planId?: string;
  nvmAgentId?: string;
  planIds?: string[];
  endpoints?: Array<Record<string, string>>;
  tags?: string[];
  keywords?: string[];
  category?: string;
  integration?: string;
  teamName?: string;
  apiSchema?: string;
  [key: string]: unknown;
}

async function discoverSellers(filter?: string): Promise<Seller[]> {
  console.log(`\nDiscovering sellers from: ${HACKATHON_DISCOVER_URL}`);
  const response = await fetch(HACKATHON_DISCOVER_URL, {
    headers: { "x-nvm-api-key": NVM_API_KEY! },
  });

  if (!response.ok) {
    console.error(`Discovery API returned ${response.status}: ${response.statusText}`);
    return [];
  }

  const body = await response.json() as Record<string, unknown>;

  // The API returns { sellers: [...] }
  let sellers: Seller[] = [];
  if (body.sellers && Array.isArray(body.sellers)) {
    sellers = body.sellers;
  } else if (Array.isArray(body)) {
    sellers = body as unknown as Seller[];
  } else if (body.agents) {
    sellers = body.agents as Seller[];
  }

  console.log(`Found ${sellers.length} seller(s) total.`);

  if (filter) {
    const lowerFilter = filter.toLowerCase();
    sellers = sellers.filter((s) => {
      const text = [
        s.name,
        s.description,
        s.category,
        ...(s.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(lowerFilter);
    });
    console.log(`${sellers.length} seller(s) match filter "${filter}".`);
  }

  return sellers;
}

function extractEndpointUrl(seller: Seller): string | undefined {
  // Try endpointUrl field (hackathon API)
  if (seller.endpointUrl && typeof seller.endpointUrl === "string") {
    const url = seller.endpointUrl as string;
    if (url.startsWith("http")) return url;
  }

  // Try endpoints array
  if (seller.endpoints && seller.endpoints.length > 0) {
    const first = seller.endpoints[0];
    const url = Object.values(first)[0];
    if (url) return url;
  }

  // Try integration field (often contains the URL)
  if (seller.integration) {
    const match = seller.integration.match(/https?:\/\/[^\s,]+/);
    if (match) return match[0];
  }

  // Try apiSchema for endpoint hints
  if (seller.apiSchema && typeof seller.apiSchema === "string") {
    try {
      const schema = JSON.parse(seller.apiSchema);
      if (schema.endpoint) {
        const match = schema.endpoint.match(/https?:\/\/[^\s,]+/);
        if (match) return match[0];
      }
    } catch { /* ignore */ }
  }

  return undefined;
}

async function buyAndCall(
  payments: Payments,
  planId: string,
  agentId: string,
  url: string,
  message: string
): Promise<void> {
  console.log(`\n--- Purchasing & Calling ---`);
  console.log(`  Plan ID:  ${planId}`);
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  URL:      ${url}`);
  console.log(`  Message:  ${message}`);

  // Step 1: Check balance and order if needed
  try {
    const balance = await payments.plans.getPlanBalance(planId);
    console.log(`  Credits remaining: ${balance.balance}`);

    if (Number(balance.balance) <= 0) {
      console.log("  No credits — ordering plan...");
      const order = await payments.plans.orderPlan(planId);
      console.log(`  Order result: ${JSON.stringify(order).slice(0, 200)}`);
    }
  } catch (err: unknown) {
    console.log(`  Balance check failed (${err instanceof Error ? err.message : err}), attempting order...`);
    try {
      const order = await payments.plans.orderPlan(planId);
      console.log(`  Order result: ${JSON.stringify(order).slice(0, 200)}`);
    } catch (orderErr: unknown) {
      console.error(`  Order failed: ${orderErr instanceof Error ? orderErr.message : orderErr}`);
    }
  }

  // Step 2: Get x402 access token
  let accessToken: string;
  try {
    const access = await payments.x402.getX402AccessToken(planId, agentId);
    accessToken =
      typeof access === "string"
        ? access
        : (access as Record<string, string>).accessToken ||
          (access as Record<string, string>).token ||
          JSON.stringify(access);
    console.log(`  Access token obtained (${accessToken.length} chars).`);
  } catch (err: unknown) {
    console.error(`  Failed to get access token: ${err instanceof Error ? err.message : err}`);
    return;
  }

  // Step 3: Call the seller's endpoint
  console.log(`  Calling ${url}...`);
  try {
    // Try to parse message as JSON (for structured payloads), fall back to { message }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(message);
    } catch {
      payload = { message };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "payment-signature": accessToken,
        "PAYMENT-SIGNATURE": accessToken,
      },
      body: JSON.stringify(payload),
    });

    console.log(`  Response status: ${res.status} ${res.statusText}`);

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(`  Response body:\n${JSON.stringify(json, null, 2)}`);
    } catch {
      console.log(`  Response body (raw):\n${text.slice(0, 1000)}`);
    }
  } catch (err: unknown) {
    console.error(`  Request failed: ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const payments = getPayments();

  // Direct mode: --plan-id X --agent-id Y --url Z --message M
  const planIdIdx = args.indexOf("--plan-id");
  const agentIdIdx = args.indexOf("--agent-id");
  const urlIdx = args.indexOf("--url");
  const messageIdx = args.indexOf("--message");

  if (planIdIdx >= 0 && agentIdIdx >= 0 && urlIdx >= 0) {
    const planId = args[planIdIdx + 1];
    const agentId = args[agentIdIdx + 1];
    const url = args[urlIdx + 1];
    const message = messageIdx >= 0 ? args[messageIdx + 1] : "Hello from CloudAGI!";

    await buyAndCall(payments, planId, agentId, url, message);
    return;
  }

  // Discovery mode
  const filterIdx = args.indexOf("--filter");
  const filter = filterIdx >= 0 ? args[filterIdx + 1] : undefined;
  const maxIdx = args.indexOf("--max");
  const maxSellers = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : 5;
  const defaultMessage =
    messageIdx >= 0
      ? args[messageIdx + 1]
      : "Hello from CloudAGI! What services do you offer?";

  const sellers = await discoverSellers(filter);

  if (sellers.length === 0) {
    console.log("\nNo sellers found. Try a different filter or check the API.");
    return;
  }

  // Normalize field names from hackathon API
  for (const s of sellers) {
    if (!s.agentId && s.nvmAgentId) s.agentId = s.nvmAgentId;
    if (!s.planId && s.planIds?.length) s.planId = s.planIds[0];
    if (!s.tags && s.keywords) s.tags = s.keywords;
  }

  // Filter out our own agents
  const otherSellers = sellers.filter(
    (s) => s.teamName !== "Cloudagi.ai" && s.teamName !== "CloudAGI"
  );

  // List all sellers
  console.log(`\n=== Available Sellers (${otherSellers.length} from other teams) ===\n`);
  for (let i = 0; i < otherSellers.length; i++) {
    const s = otherSellers[i];
    const url = extractEndpointUrl(s);
    console.log(
      `[${i}] ${s.name || "Unknown"} (${s.teamName || "?"})\n` +
        `    Description: ${(s.description || "").slice(0, 120)}\n` +
        `    Agent ID:    ${s.agentId || "N/A"}\n` +
        `    Plan ID:     ${s.planId || "N/A"}\n` +
        `    Endpoint:    ${url || "N/A"}\n` +
        `    Tags:        ${(s.tags || []).join(", ") || "none"}\n`
    );
  }

  // Try to buy from the first N sellers that have the required fields
  const candidates = otherSellers
    .filter((s) => s.planId && s.agentId && extractEndpointUrl(s))
    .slice(0, maxSellers);

  if (candidates.length === 0) {
    console.log(
      "\nNo sellers have complete plan/agent/endpoint info for automated purchasing."
    );
    console.log(
      "Use --plan-id, --agent-id, and --url flags to call a specific seller."
    );
    return;
  }

  console.log(`\n=== Purchasing from ${candidates.length} seller(s) ===\n`);

  for (const seller of candidates) {
    console.log(`\n>>> ${seller.name || "Unknown Seller"}`);
    const url = extractEndpointUrl(seller)!;
    await buyAndCall(payments, seller.planId!, seller.agentId!, url, defaultMessage);
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
