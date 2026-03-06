import { buildPaymentRequired, Payments } from "@nevermined-io/payments";
import { config } from "../config";

type VerificationResult = {
  isValid: boolean;
  invalidReason?: string;
  transaction?: string;
  creditsRedeemed?: bigint;
};

let paymentsInstance: Payments | null = null;

export function isNeverminedConfigured(): boolean {
  return Boolean(
    config.nevermined.apiKey && config.nevermined.agentId && config.nevermined.planId
  );
}

export function getPayments(): Payments {
  if (!paymentsInstance) {
    paymentsInstance = Payments.getInstance({
      nvmApiKey: config.nevermined.apiKey,
      environment: config.nevermined.environment as never
    });
  }

  return paymentsInstance;
}

export function getPlanMetadata() {
  return {
    agentId: config.nevermined.agentId,
    planId: config.nevermined.planId,
    offerName: config.offerName,
    priceUsdc: config.priceUsdc
  };
}

export function buildPaymentRequirement(endpoint: string, method: string) {
  if (!isNeverminedConfigured()) {
    throw new Error("Nevermined is not configured");
  }

  return buildPaymentRequired(config.nevermined.planId, {
    endpoint,
    agentId: config.nevermined.agentId,
    httpVerb: method
  });
}

export async function verifyAccessToken(
  accessToken: string,
  endpoint: string,
  method: string,
  maxAmount: bigint
): Promise<VerificationResult> {
  const paymentRequired = buildPaymentRequirement(endpoint, method);

  const verification = await getPayments().facilitator.verifyPermissions({
    paymentRequired,
    x402AccessToken: accessToken,
    maxAmount
  });

  return verification as VerificationResult;
}

export async function settleAccessToken(
  accessToken: string,
  endpoint: string,
  method: string,
  maxAmount: bigint
) {
  const paymentRequired = buildPaymentRequirement(endpoint, method);

  return getPayments().facilitator.settlePermissions({
    paymentRequired,
    x402AccessToken: accessToken,
    maxAmount
  });
}
