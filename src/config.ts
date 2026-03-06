const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  appName: "CloudAGI",
  version: "0.1.0",
  host: process.env.HOST || "0.0.0.0",
  port: toInt(process.env.PORT, 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  adminKey: process.env.ADMIN_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN || "https://cloudagi.org",
  offerName: process.env.CLOUDAGI_OFFER_NAME || "CloudAGI Fast Run",
  priceUsdc: process.env.CLOUDAGI_PRICE_USDC || "25",
  offerCredits: BigInt(process.env.CLOUDAGI_PLAN_CREDITS || "1"),
  modal: {
    appName: process.env.MODAL_APP_NAME || "cloudagi",
    image: process.env.MODAL_IMAGE || "python:3.13",
    environmentName: process.env.MODAL_ENVIRONMENT_NAME || "main",
    gpu: process.env.MODAL_GPU || "none",
    timeoutSecs: toInt(process.env.MODAL_TIMEOUT_SECS, 1800)
  },
  nevermined: {
    apiKey: process.env.NVM_API_KEY || "",
    environment: process.env.NVM_ENVIRONMENT || "sandbox",
    agentId: process.env.NVM_AGENT_ID || "",
    planId: process.env.NVM_PLAN_ID || "",
    builderAddress: process.env.NVM_BUILDER_ADDRESS || "",
    usdcAddress:
      process.env.NVM_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
} as const;

export function requireAdminKey(req: Request): boolean {
  if (!config.adminKey) {
    return false;
  }

  return req.headers.get("x-admin-key") === config.adminKey;
}
