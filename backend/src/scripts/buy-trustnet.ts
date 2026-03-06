/**
 * buy-trustnet.ts — Buy TrustNet plan and call their MCP tools
 *
 * Usage:
 *   cd backend && export $(grep -v '^#' .env | grep -v '^$' | xargs) && bun run src/scripts/buy-trustnet.ts
 */
import { Payments } from "@nevermined-io/payments";

const NVM_API_KEY = process.env.NVM_API_KEY!;
const payments = Payments.getInstance({ nvmApiKey: NVM_API_KEY, environment: "sandbox" as never });

const TRUSTNET_PLAN_ID = "111171385715053379363820285370903002263619322296632596378198131296828952605172";
const SERVER_URL = "https://trust-net-mcp.rikenshah-02.workers.dev";

// Step 1: Find TrustNet's agent ID from hackathon discover API
async function findTrustNetAgentId(): Promise<string | null> {
  console.log("Looking up TrustNet agent ID from marketplace...");
  const res = await fetch("https://nevermined.ai/hackathon/register/api/discover?side=sell", {
    headers: { "x-nvm-api-key": NVM_API_KEY }
  });
  const body = await res.json() as { sellers?: Array<{ name?: string; teamName?: string; nvmAgentId?: string; planIds?: string[] }> };
  const sellers = body.sellers || [];

  for (const s of sellers) {
    const text = [s.name, s.teamName].filter(Boolean).join(" ").toLowerCase();
    if (text.includes("trust") && text.includes("net")) {
      console.log(`  Found: ${s.name} (${s.teamName}) — AgentID: ${s.nvmAgentId}`);
      return s.nvmAgentId || null;
    }
    // Also match by plan ID
    if (s.planIds?.includes(TRUSTNET_PLAN_ID)) {
      console.log(`  Found by planId: ${s.name} (${s.teamName}) — AgentID: ${s.nvmAgentId}`);
      return s.nvmAgentId || null;
    }
  }
  return null;
}

// Step 2: Call an MCP tool
async function callMcpTool(
  agentId: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  // Get fresh x402 token
  const access = await payments.x402.getX402AccessToken(TRUSTNET_PLAN_ID, agentId);
  const token = typeof access === "string"
    ? access
    : (access as Record<string, string>).accessToken || (access as Record<string, string>).token || JSON.stringify(access);

  console.log(`  Token obtained (${token.length} chars), calling ${toolName}...`);

  const res = await fetch(`${SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: 1,
    }),
  });

  console.log(`  Response: ${res.status} ${res.statusText}`);
  const result = await res.json();
  return result;
}

async function main() {
  // Find agent ID
  const agentId = await findTrustNetAgentId();
  if (!agentId) {
    console.error("Could not find TrustNet agent ID. Trying without agent ID...");
  }

  // Order the plan
  console.log("\nOrdering TrustNet USDC plan...");
  try {
    const order = await payments.plans.orderPlan(TRUSTNET_PLAN_ID);
    console.log("  Order:", JSON.stringify(order).slice(0, 200));
  } catch (e: unknown) {
    console.log("  Order (may already have credits):", e instanceof Error ? e.message.slice(0, 200) : String(e));
  }

  // Check balance
  try {
    const bal = await payments.plans.getPlanBalance(TRUSTNET_PLAN_ID);
    console.log("  Balance:", JSON.stringify(bal));
  } catch (e: unknown) {
    console.log("  Balance check error:", e instanceof Error ? e.message : String(e));
  }

  const aid = agentId || "";

  // Tool 1: list_agents
  console.log("\n=== Tool 1: list_agents ===");
  try {
    const result = await callMcpTool(aid, "list_agents");
    const r = result as Record<string, unknown>;
    const content = (r.result as Record<string, unknown>)?.content as Array<{ text: string }>;
    if (content?.[0]?.text) {
      const parsed = JSON.parse(content[0].text);
      const items = parsed.items || parsed.agents || [];
      console.log(`  Found ${items.length} agents:`);
      for (const a of items.slice(0, 10)) {
        console.log(`    ${a.verified ? "V" : " "} ${a.name} — trust: ${a.trust_score}, price: ${a.price || "?"}`);
      }
    } else {
      console.log("  Result:", JSON.stringify(result).slice(0, 500));
    }
  } catch (e: unknown) {
    console.error("  list_agents failed:", e instanceof Error ? e.message : String(e));
  }

  // Tool 2: search_agents
  console.log("\n=== Tool 2: search_agents ===");
  try {
    const result = await callMcpTool(aid, "search_agents", {
      query: "web scraping data extraction",
      limit: 5
    });
    const r = result as Record<string, unknown>;
    const content = (r.result as Record<string, unknown>)?.content as Array<{ text: string }>;
    if (content?.[0]?.text) {
      const parsed = JSON.parse(content[0].text);
      console.log(`  ${parsed.resultCount || 0} matches:`);
      for (const m of (parsed.results || []).slice(0, 5)) {
        console.log(`    ${m.name} — relevance: ${m.relevance}, trust: ${m.trust_score}`);
      }
    } else {
      console.log("  Result:", JSON.stringify(result).slice(0, 500));
    }
  } catch (e: unknown) {
    console.error("  search_agents failed:", e instanceof Error ? e.message : String(e));
  }

  // Tool 3: search_agents (different query)
  console.log("\n=== Tool 3: search_agents (GPU compute) ===");
  try {
    const result = await callMcpTool(aid, "search_agents", {
      query: "GPU compute AI inference machine learning",
      limit: 5
    });
    const r = result as Record<string, unknown>;
    const content = (r.result as Record<string, unknown>)?.content as Array<{ text: string }>;
    if (content?.[0]?.text) {
      const parsed = JSON.parse(content[0].text);
      console.log(`  ${parsed.resultCount || 0} matches:`);
      for (const m of (parsed.results || []).slice(0, 5)) {
        console.log(`    ${m.name} — relevance: ${m.relevance}, trust: ${m.trust_score}`);
      }
    } else {
      console.log("  Result:", JSON.stringify(result).slice(0, 500));
    }
  } catch (e: unknown) {
    console.error("  search_agents failed:", e instanceof Error ? e.message : String(e));
  }

  console.log("\n=== Done — 3 TrustNet tool calls complete ===");
}

main().catch(console.error);
