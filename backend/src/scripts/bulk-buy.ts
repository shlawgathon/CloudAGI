/**
 * bulk-buy.ts — Order plans and call endpoints from all accessible marketplace sellers.
 * Maximizes leaderboard activity by attempting purchases from every team.
 *
 * Usage:
 *   cd backend && export $(grep -v '^#' .env | xargs) && bun run src/scripts/bulk-buy.ts
 */

import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = process.env.NVM_API_KEY!;
const NVM_ENVIRONMENT = (process.env.NVM_ENVIRONMENT || "sandbox") as never;
const DISCOVER_URL = "https://nevermined.ai/hackathon/register/api/discover?side=sell";

const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: NVM_ENVIRONMENT });

interface Seller {
  name: string;
  teamName: string;
  nvmAgentId: string;
  planIds: string[];
  endpointUrl: string;
  apiSchema?: unknown;
  [key: string]: unknown;
}

async function discover(): Promise<Seller[]> {
  const res = await fetch(DISCOVER_URL, { headers: { "x-nvm-api-key": NVM_API_KEY } });
  const body = await res.json() as { sellers: Seller[] };
  return body.sellers || [];
}

async function tryBuy(seller: Seller): Promise<string> {
  const planId = seller.planIds?.[0];
  const agentId = seller.nvmAgentId;
  const url = seller.endpointUrl;

  if (!planId || !agentId) return "missing IDs";
  if (!url || !url.startsWith("http") || url.includes("localhost") || url.includes("127.0.0.1")) {
    return "no reachable endpoint";
  }

  // Step 1: Order plan
  try {
    await payments.plans.orderPlan(planId);
  } catch (e: unknown) {
    // May already have credits
  }

  // Step 2: Get token
  let token: string;
  try {
    const access = await payments.x402.getX402AccessToken(planId, agentId);
    token = typeof access === "string" ? access :
      (access as Record<string, string>).accessToken ||
      (access as Record<string, string>).token || "";
    if (!token) return "empty token";
  } catch (e: unknown) {
    return `token failed: ${e instanceof Error ? e.message : e}`;
  }

  // Step 3: Call endpoint
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "payment-signature": token,
        "PAYMENT-SIGNATURE": token,
      },
      body: JSON.stringify({ message: "Hello from CloudAGI! Testing agent-to-agent commerce.", query: "test", prompt: "test" }),
      signal: AbortSignal.timeout(15000),
    });
    return `${res.status} ${res.statusText}`;
  } catch (e: unknown) {
    return `call failed: ${e instanceof Error ? e.message : e}`;
  }
}

async function main() {
  const sellers = await discover();
  const others = sellers.filter(s => s.teamName !== "Cloudagi.ai" && s.teamName !== "CloudAGI");
  console.log(`Found ${others.length} sellers from other teams\n`);

  let success = 0;
  let fail = 0;

  for (const s of others) {
    const name = `${s.name} (${s.teamName})`;
    process.stdout.write(`${name.padEnd(55)} `);
    const result = await tryBuy(s);
    const ok = result.startsWith("2") || result.startsWith("4"); // 2xx or 402/400 = we reached them
    if (ok || result.includes("token")) {
      // If we got a token, the purchase went through even if the call failed
    }
    if (result.startsWith("2")) success++;
    else fail++;
    console.log(result);
  }

  console.log(`\nResults: ${success} successful calls, ${fail} failed/unreachable`);
}

main().catch(console.error);
