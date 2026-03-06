import { Payments } from "@nevermined-io/payments";
import { config } from "../config";

function asAddress(value: string): `0x${string}` {
  if (!value.startsWith("0x")) {
    throw new Error(`Expected 0x-prefixed address, received: ${value}`);
  }

  return value as `0x${string}`;
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
    environment: config.nevermined.environment as never
  });

  const priceConfig =
    config.nevermined.paymentRail === "fiat"
      ? payments.plans.getFiatPriceConfig(
          config.offerPriceUnits,
          asAddress(config.nevermined.builderAddress)
        )
      : payments.plans.getERC20PriceConfig(
          config.offerPriceUnits,
          asAddress(config.nevermined.usdcAddress),
          asAddress(config.nevermined.builderAddress)
        );

  const { agentId, planId } = await payments.agents.registerAgentAndPlan(
    {
      name: config.offerName,
      description:
        `CloudAGI runs GPU jobs on Modal and returns logs plus artifacts for a fixed ${config.offerPriceLabel} price.`,
      tags: ["cloudagi", "gpu", "modal", "compute", config.nevermined.paymentRail],
      dateCreated: new Date()
    },
    {
      endpoints: [{ POST: `${config.appBaseUrl}/v1/orders/:id/start` }],
      openEndpoints: ["/", "/order.html", "/v1/health"],
      agentDefinitionUrl: `${config.appBaseUrl}/.well-known/agent.json`,
      authType: "none"
    },
    {
      name: `${config.offerName} Plan`,
      description: "Single paid GPU job execution credit.",
      dateCreated: new Date()
    },
    priceConfig,
    payments.plans.getFixedCreditsConfig(config.offerCredits, 1n)
  );

  console.log(JSON.stringify({ agentId, planId }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
