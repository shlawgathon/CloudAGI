const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const offerPriceAmount = process.env.CLOUDAGI_PRICE_AMOUNT || process.env.CLOUDAGI_PRICE_USDC || "25";
const paymentRail = process.env.NVM_PAYMENT_RAIL === "fiat" ? "fiat" : "crypto";
const paymentCurrency = process.env.CLOUDAGI_PAYMENT_CURRENCY || (paymentRail === "fiat" ? "USD" : "USDC");
const offerPriceLabel = process.env.CLOUDAGI_PRICE_LABEL || `${offerPriceAmount} ${paymentCurrency}`;
const defaultPriceUnits =
  paymentRail === "fiat"
    ? BigInt(Math.round(Number(offerPriceAmount) * 100).toString())
    : BigInt(Math.round(Number(offerPriceAmount) * 1_000_000).toString());
const offerPriceUnits = BigInt(process.env.CLOUDAGI_PRICE_UNITS || defaultPriceUnits.toString());

export const config = {
  appName: "CloudAGI",
  version: "0.1.0",
  host: process.env.HOST || "0.0.0.0",
  port: toInt(process.env.PORT, 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  adminKey: process.env.ADMIN_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN || "https://cloudagi.org",
  offerName: process.env.CLOUDAGI_OFFER_NAME || "CloudAGI Fast Run",
  offerPriceAmount,
  offerPriceLabel,
  offerPriceUnits,
  paymentCurrency,
  offerCredits: BigInt(process.env.CLOUDAGI_PLAN_CREDITS || "1"),
  creditsPerHour: 60,
  pricePerHour: process.env.CLOUDAGI_PRICE_PER_HOUR || "25",
  modal: {
    appName: process.env.MODAL_APP_NAME || "cloudagi",
    image: process.env.MODAL_IMAGE || "python:3.13",
    environmentName: process.env.MODAL_ENVIRONMENT_NAME || "main",
    gpu: process.env.MODAL_GPU || "none",
    timeoutSecs: toInt(process.env.MODAL_TIMEOUT_SECS, 1800)
  },
  trinity: {
    baseUrl: process.env.TRINITY_BASE_URL || "",
    apiKey: process.env.TRINITY_API_KEY || "",
    systemName: process.env.TRINITY_SYSTEM_NAME || "cloudagi-fixed-system",
    orchestratorAgent: process.env.TRINITY_ORCHESTRATOR_AGENT || "orchestrator",
    sharedSecret: process.env.TRINITY_SHARED_SECRET || ""
  },
  nevermined: {
    apiKey: process.env.NVM_API_KEY || "",
    environment: process.env.NVM_ENVIRONMENT || "sandbox",
    paymentRail,
    agentId: process.env.NVM_AGENT_ID || "",
    planId: process.env.NVM_PLAN_ID || "",
    builderAddress: process.env.NVM_BUILDER_ADDRESS || "",
    usdcAddress:
      process.env.NVM_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  exa: {
    apiKey: process.env.EXA_API_KEY || ""
  },
  apify: {
    apiToken: process.env.APIFY_API_TOKEN || ""
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || ""
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6"
  }
} as const;

export function requireAdminKey(req: Request): boolean {
  if (!config.adminKey) {
    return false;
  }

  return req.headers.get("x-admin-key") === config.adminKey;
}
