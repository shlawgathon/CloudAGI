/**
 * Fix hackathon marketplace metadata:
 * 1. Update the 5 current agents with category, keywords, apiSchema
 * 2. Delete 7 old/duplicate agents
 */

const NVM_API_KEY = process.env.NVM_API_KEY!;
const HACKATHON_API = "https://nevermined.ai/hackathon/register/api";

const headers = {
  "Content-Type": "application/json",
  "x-nvm-api-key": NVM_API_KEY,
};

// The 5 new agent NVM IDs we want to keep
const KEEP_NVM_IDS = new Set([
  "13156123576027796413376079439062536146642852527273496078047229559627872756363", // GPU Compute
  "25409769493050730003656773097404442524470268445728853821164969804453439812707", // AI Research
  "30570669724015570727136243547232878579778240670435544830577461054773078922055", // Web Scraper
  "11699646482319547205540492987044479484202228820270714943423846374612570056379", // Code Review
  "57223745423852320009773888992048929378416542610002500439982652770591348720233", // Smart Search
]);

// Metadata to set per service (keyed by NVM agent ID)
const SERVICE_META: Record<string, {
  category: string;
  keywords: string[];
  servicesSold: string;
  servicesProvidedPerRequest: string;
  apiSchema: string;
}> = {
  "13156123576027796413376079439062536146642852527273496078047229559627872756363": {
    category: "Infrastructure",
    keywords: ["gpu", "compute", "cloud", "cloudagi", "modal", "ml", "inference", "serverless", "cuda", "api", "agent"],
    servicesSold: "Serverless GPU compute (T4, A10G, A100, H100)",
    servicesProvidedPerRequest: "One GPU sandbox execution (command run with stdout/stderr)",
    apiSchema: JSON.stringify({
      endpoint: "POST /v1/services/gpu-compute/execute",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "<x402 access token>" },
      body: { command: ["python3", "-c", "print('hello')"], gpu: "T4", image: "python:3.13", timeoutSecs: 1800 },
      response: { success: true, data: { exitCode: 0, stdout: "hello\\n", stderr: "", sandboxId: "sb-xxx", gpu: "T4" } },
    }),
  },
  "25409769493050730003656773097404442524470268445728853821164969804453439812707": {
    category: "Research",
    keywords: ["search", "research", "cloud", "cloudagi", "exa", "neural-search", "semantic", "papers", "api", "agent"],
    servicesSold: "Neural semantic search via Exa",
    servicesProvidedPerRequest: "One semantic search query returning ranked results with text and highlights",
    apiSchema: JSON.stringify({
      endpoint: "POST /v1/services/ai-research/execute",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "<x402 access token>" },
      body: { query: "transformer architecture papers", numResults: 5, type: "auto" },
      response: { success: true, data: { results: [{ title: "...", url: "...", text: "...", highlights: ["..."] }] } },
    }),
  },
  "30570669724015570727136243547232878579778240670435544830577461054773078922055": {
    category: "Data Analytics",
    keywords: ["scraping", "cloud", "cloudagi", "apify", "web", "data", "extraction", "api", "agent"],
    servicesSold: "Web scraping and structured data extraction",
    servicesProvidedPerRequest: "One website scrape returning structured JSON data",
    apiSchema: JSON.stringify({
      endpoint: "POST /v1/services/web-scraper/execute",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "<x402 access token>" },
      body: { url: "https://example.com", maxPages: 1 },
      response: { success: true, data: [{ url: "...", title: "...", text: "..." }] },
    }),
  },
  "11699646482319547205540492987044479484202228820270714943423846374612570056379": {
    category: "AI/ML",
    keywords: ["code-review", "security", "cloud", "cloudagi", "analysis", "ai", "api", "agent"],
    servicesSold: "AI-powered code review and security analysis",
    servicesProvidedPerRequest: "One code review with structured JSON report (issues, severity, suggestions, score)",
    apiSchema: JSON.stringify({
      endpoint: "POST /v1/services/code-review/execute",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "<x402 access token>" },
      body: { code: "function add(a, b) { return a + b; }", language: "javascript", focus: ["bugs", "security", "performance"] },
      response: { success: true, data: { issues: [{ severity: "info", line: 1, message: "...", suggestion: "..." }], summary: "...", score: 9 } },
    }),
  },
  "57223745423852320009773888992048929378416542610002500439982652770591348720233": {
    category: "Research",
    keywords: ["search", "cloud", "cloudagi", "aggregator", "multi-source", "cheap", "api", "agent"],
    servicesSold: "Multi-source search aggregation",
    servicesProvidedPerRequest: "One multi-source search query returning deduplicated results from multiple providers",
    apiSchema: JSON.stringify({
      endpoint: "POST /v1/services/smart-search/execute",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": "<x402 access token>" },
      body: { query: "latest AI research", numResults: 5, sources: ["exa"] },
      response: { success: true, data: { query: "...", totalResults: 5, results: [{ title: "...", url: "...", snippet: "...", source: "exa" }] } },
    }),
  },
};

interface HackathonAgent {
  id: string;
  name: string;
  category: string;
  nvmAgentId: string;
  marketplaceReady: boolean;
  keywords: string[];
  apiSchema: string | null;
  [key: string]: unknown;
}

async function main() {
  // 1. Fetch all our agents
  const res = await fetch(`${HACKATHON_API}/agents`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch agents: ${res.status} ${await res.text()}`);
  }
  const agents: HackathonAgent[] = await res.json();
  console.log(`Found ${agents.length} agents on hackathon platform\n`);

  // Separate into keep vs delete
  const seen = new Set<string>();
  const toKeep: HackathonAgent[] = [];
  const toDelete: HackathonAgent[] = [];

  for (const agent of agents) {
    if (KEEP_NVM_IDS.has(agent.nvmAgentId) && !seen.has(agent.nvmAgentId)) {
      seen.add(agent.nvmAgentId);
      toKeep.push(agent);
    } else {
      toDelete.push(agent);
    }
  }

  console.log(`Keeping ${toKeep.length} agents, deleting ${toDelete.length} duplicates/old\n`);

  // 2. Delete old/duplicate agents
  for (const agent of toDelete) {
    console.log(`Deleting: ${agent.name} (${agent.id})...`);
    try {
      const delRes = await fetch(`${HACKATHON_API}/agents/${agent.id}`, {
        method: "DELETE",
        headers,
      });
      if (delRes.ok) {
        console.log(`  Deleted successfully`);
      } else {
        const text = await delRes.text();
        console.log(`  Delete returned ${delRes.status}: ${text.slice(0, 200)}`);
      }
    } catch (e: any) {
      console.log(`  Delete failed: ${e.message}`);
    }
  }

  // 3. Update remaining agents with metadata
  console.log(`\nUpdating ${toKeep.length} agents with metadata...\n`);
  for (const agent of toKeep) {
    const meta = SERVICE_META[agent.nvmAgentId];
    if (!meta) {
      console.log(`  No metadata mapping for ${agent.name}, skipping`);
      continue;
    }

    console.log(`Updating: ${agent.name} (${agent.id})...`);
    const updateBody = {
      category: meta.category,
      keywords: meta.keywords,
      servicesSold: meta.servicesSold,
      servicesProvidedPerRequest: meta.servicesProvidedPerRequest,
      apiSchema: meta.apiSchema,
    };

    // Try PUT
    let updateRes = await fetch(`${HACKATHON_API}/agents/${agent.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updateBody),
    });

    if (!updateRes.ok) {
      // Try PATCH
      updateRes = await fetch(`${HACKATHON_API}/agents/${agent.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updateBody),
      });
    }

    if (updateRes.ok) {
      const result = await updateRes.json();
      console.log(`  Updated! marketplaceReady: ${result.marketplaceReady ?? "unknown"}`);
    } else {
      const text = await updateRes.text();
      console.log(`  Update failed ${updateRes.status}: ${text.slice(0, 300)}`);
    }
  }

  // 4. Verify
  console.log(`\n=== Verification ===`);
  const verifyRes = await fetch(`${HACKATHON_API}/agents`, { headers });
  const remaining: HackathonAgent[] = await verifyRes.json();
  console.log(`Agents remaining: ${remaining.length}`);
  for (const a of remaining) {
    console.log(`  ${a.name}: category="${a.category}" ready=${a.marketplaceReady} keywords=${a.keywords?.length || 0}`);
  }
}

main().catch(console.error);
