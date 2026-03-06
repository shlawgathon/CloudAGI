import { Payments } from "@nevermined-io/payments";
import { config } from "../config";
import "../services/init";
import { getAllServices, type ServiceDefinition } from "../services/registry";

function asAddress(value: string): `0x${string}` {
  if (!value.startsWith("0x")) {
    throw new Error(`Expected 0x-prefixed address, received: ${value}`);
  }
  return value as `0x${string}`;
}

function toPriceUnits(amount: string, rail: string): bigint {
  const num = Number(amount);
  if (rail === "fiat") {
    return BigInt(Math.round(num * 100).toString());
  }
  return BigInt(Math.round(num * 1_000_000).toString());
}

async function registerOneService(
  payments: Payments,
  service: ServiceDefinition
) {
  const rail = config.nevermined.paymentRail;
  const priceUnits = toPriceUnits(service.priceAmount, rail);

  const priceConfig =
    rail === "fiat"
      ? payments.plans.getFiatPriceConfig(
          priceUnits,
          asAddress(config.nevermined.builderAddress)
        )
      : payments.plans.getERC20PriceConfig(
          priceUnits,
          asAddress(config.nevermined.usdcAddress),
          asAddress(config.nevermined.builderAddress)
        );

  const integrationInstructions: Record<string, string> = {
    "gpu-compute": `POST ${config.appBaseUrl}/v1/services/gpu-compute/execute with JSON body {"command": ["python3", "-c", "print('hello')"], "gpu": "T4"}. Requires x402 PAYMENT-SIGNATURE header.`,
    "ai-research": `POST ${config.appBaseUrl}/v1/services/ai-research/execute with JSON body {"query": "your search query", "numResults": 5}. Requires x402 PAYMENT-SIGNATURE header.`,
    "web-scraper": `POST ${config.appBaseUrl}/v1/services/web-scraper/execute with JSON body {"url": "https://example.com"}. Requires x402 PAYMENT-SIGNATURE header.`,
    "code-review": `POST ${config.appBaseUrl}/v1/services/code-review/execute with JSON body {"code": "your code here", "language": "python"}. Requires x402 PAYMENT-SIGNATURE header.`,
    "smart-search": `POST ${config.appBaseUrl}/v1/services/smart-search/execute with JSON body {"query": "your search query"}. Requires x402 PAYMENT-SIGNATURE header.`,
  };

  const apiDescriptions: Record<string, string> = {
    "gpu-compute": "Execute commands in serverless GPU sandboxes. Input: {command: string[], gpu?: 'T4'|'A10G'|'A100'|'H100', image?: string, timeoutSecs?: number}. Output: {exitCode, stdout, stderr, sandboxId}.",
    "ai-research": "Neural semantic search via Exa. Input: {query: string, numResults?: number, type?: 'auto'|'neural'|'keyword'}. Output: Exa search results with text, highlights, and metadata.",
    "web-scraper": "Extract structured data from websites. Input: {url: string, maxPages?: number} or {actorId: string, input: object}. Output: Array of structured page data.",
    "code-review": "AI code review. Input: {code: string, language?: string, focus?: string[]}. Output: {issues: [{severity, line, message, suggestion}], summary, score}.",
    "smart-search": "Multi-source search aggregator. Input: {query: string, numResults?: number, sources?: string[]}. Output: {query, totalResults, results: [{title, url, snippet, source}]}.",
  };

  const { agentId, planId } = await payments.agents.registerAgentAndPlan(
    {
      name: `CloudAGI ${service.name}`,
      description: service.description,
      tags: ["cloudagi", ...service.tags, rail],
      dateCreated: new Date(),
      author: "CloudAGI",
      integration: integrationInstructions[service.id] || `POST ${config.appBaseUrl}/v1/services/${service.id}/execute with JSON body. Requires x402 PAYMENT-SIGNATURE header.`,
      sampleLink: `${config.appBaseUrl}/.well-known/agent.json`,
      apiDescription: apiDescriptions[service.id] || service.description,
    },
    {
      endpoints: [
        { POST: `${config.appBaseUrl}/v1/services/${service.id}/execute` },
      ],
      openEndpoints: [
        "/",
        "/v1/health",
        "/v1/services",
        `/v1/services/${service.id}`,
        "/.well-known/agent.json",
      ],
      agentDefinitionUrl: `${config.appBaseUrl}/.well-known/agent.json`,
      authType: "none",
    },
    {
      name: `CloudAGI ${service.name} Plan`,
      description: `Access to ${service.name}: ${service.description}`,
      dateCreated: new Date(),
    },
    priceConfig,
    payments.plans.getFixedCreditsConfig(config.offerCredits, 1n)
  );

  return { serviceId: service.id, agentId, planId };
}

async function main() {
  if (!config.nevermined.apiKey) {
    throw new Error("NVM_API_KEY is required");
  }
  if (!config.nevermined.builderAddress) {
    throw new Error("NVM_BUILDER_ADDRESS is required");
  }

  const payments = Payments.getInstance({
    nvmApiKey: config.nevermined.apiKey,
    environment: config.nevermined.environment as never,
  });

  const services = getAllServices();
  console.log(`Registering ${services.length} services on Nevermined...\n`);

  const results: Array<{ serviceId: string; agentId: string; planId: string }> = [];

  for (const service of services) {
    try {
      console.log(`Registering: ${service.name} (${service.id})...`);
      const result = await registerOneService(payments, service);
      results.push(result);
      console.log(`  Agent ID: ${result.agentId}`);
      console.log(`  Plan ID:  ${result.planId}\n`);
    } catch (error) {
      console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  console.log("\n=== Add to .env ===\n");
  for (const r of results) {
    const envPrefix = `NVM_${r.serviceId.toUpperCase().replace(/-/g, "_")}`;
    console.log(`${envPrefix}_AGENT_ID=${r.agentId}`);
    console.log(`${envPrefix}_PLAN_ID=${r.planId}`);
  }

  if (results.length > 0) {
    console.log(`\n# Primary agent (first service):`);
    console.log(`NVM_AGENT_ID=${results[0].agentId}`);
    console.log(`NVM_PLAN_ID=${results[0].planId}`);
  }

  console.log(`\nRegistered ${results.length}/${services.length} services.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
