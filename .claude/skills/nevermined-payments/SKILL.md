# Nevermined Payments Skill

## Overview

Nevermined is a decentralized marketplace protocol for AI agent services. Agents register themselves with payment plans, and consumers pay per-use via the x402 protocol (HTTP 402 Payment Required).

## SDK: @nevermined-io/payments (TypeScript)

```bash
bun add @nevermined-io/payments
```

### Core Concepts

- **Agent**: A registered service provider on Nevermined marketplace
- **Plan**: A pricing plan attached to an agent (defines cost, credits, payment method)
- **x402 Access Token**: A signed payment proof sent via `PAYMENT-SIGNATURE` header
- **Facilitator**: Nevermined's backend that verifies and settles payment tokens
- **Payment Rails**: Either "fiat" (Stripe-backed card delegation) or "crypto" (ERC-4337 USDC)

### Initialize SDK

```typescript
import { Payments } from "@nevermined-io/payments";

const payments = Payments.getInstance({
  nvmApiKey: process.env.NVM_API_KEY!,
  environment: "sandbox", // or "production"
});
```

### Register Agent + Plan

```typescript
import { Payments } from "@nevermined-io/payments";

function asAddress(value: string): `0x${string}` {
  return value as `0x${string}`;
}

const payments = Payments.getInstance({
  nvmApiKey: process.env.NVM_API_KEY!,
  environment: "sandbox",
});

// Choose payment rail
const priceConfig =
  paymentRail === "fiat"
    ? payments.plans.getFiatPriceConfig(
        priceUnits,              // BigInt in cents (e.g., 2500n = $25)
        asAddress(builderAddress)
      )
    : payments.plans.getERC20PriceConfig(
        priceUnits,              // BigInt in USDC micro-units (e.g., 25_000_000n = 25 USDC)
        asAddress(usdcAddress),  // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
        asAddress(builderAddress)
      );

const { agentId, planId } = await payments.agents.registerAgentAndPlan(
  {
    name: "My Agent",
    description: "What this agent does",
    tags: ["tag1", "tag2"],
    dateCreated: new Date(),
  },
  {
    endpoints: [{ POST: "https://my-api.com/v1/execute" }],
    openEndpoints: ["/", "/v1/health"],
    agentDefinitionUrl: "https://my-api.com/.well-known/agent.json",
    authType: "none",
  },
  {
    name: "My Plan",
    description: "Access description",
    dateCreated: new Date(),
  },
  priceConfig,
  payments.plans.getFixedCreditsConfig(1n, 1n) // credits per plan, cost per request
);
```

### x402 Payment Verification (Server-Side)

```typescript
import { buildPaymentRequired, resolveScheme } from "@nevermined-io/payments";

// 1. Build payment requirement for an endpoint
const scheme = await resolveScheme(
  payments,
  planId,
  paymentRail === "fiat" ? "nvm:card-delegation" : "nvm:erc4337"
);

const paymentRequired = buildPaymentRequired(planId, {
  endpoint: "/v1/services/my-service/execute",
  agentId,
  httpVerb: "POST",
  environment: "sandbox",
  scheme,
});

// 2. Verify incoming access token
const verification = await payments.facilitator.verifyPermissions({
  paymentRequired,
  x402AccessToken: req.headers.get("PAYMENT-SIGNATURE")!,
  maxAmount: 1n,
});

if (!verification.isValid) {
  // Return 402 with payment requirements
}

// 3. Settle (deduct credits)
const settlement = await payments.facilitator.settlePermissions({
  paymentRequired,
  x402AccessToken: req.headers.get("PAYMENT-SIGNATURE")!,
  maxAmount: 1n,
});
```

## A2A Protocol (Agent-to-Agent Discovery)

Agents expose `/.well-known/agent.json` for discovery:

```json
{
  "name": "CloudAGI",
  "version": "0.1.0",
  "description": "Multi-service AI platform",
  "url": "https://api.cloudagi.org",
  "services": [
    {
      "id": "gpu-compute",
      "name": "GPU Compute",
      "description": "Run commands in Modal sandboxes with GPU",
      "category": "compute",
      "priceLabel": "1 USDC",
      "executeUrl": "https://api.cloudagi.org/v1/services/gpu-compute/execute"
    }
  ],
  "payment": {
    "type": "nevermined-x402",
    "agentId": "did:nv:...",
    "planId": "did:nv:..."
  },
  "capabilities": { "a2a": true, "x402": true }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVM_API_KEY` | Nevermined API key (from nevermined.app Settings) | Yes |
| `NVM_ENVIRONMENT` | `sandbox` or `production` | No (default: sandbox) |
| `NVM_BUILDER_ADDRESS` | Your wallet address (from nevermined.app profile) | Yes (for registration) |
| `NVM_AGENT_ID` | Registered agent DID | Yes (after registration) |
| `NVM_PLAN_ID` | Registered plan DID | Yes (after registration) |
| `NVM_PAYMENT_RAIL` | `fiat` or `crypto` | No (default: crypto) |
| `NVM_USDC_ADDRESS` | USDC contract address | No (default: Base Sepolia) |
| `EXA_API_KEY` | Exa search API key | For ai-research + smart-search |
| `APIFY_API_TOKEN` | Apify API token | For web-scraper service |
| `ANTHROPIC_API_KEY` | Anthropic API key | For code-review service |

## CloudAGI Service Architecture

Services are registered in `backend/src/services/registry.ts`. Each handler in `backend/src/services/handlers/` calls `registerService()` on import.

**Adding a new service:**
1. Create `backend/src/services/handlers/my-service.ts`
2. Import and call `registerService({ id, name, description, category, priceLabel, priceAmount, priceCurrency, tags, handler })`
3. Import the handler in `backend/src/services/init.ts`
4. Run `cd backend && bun run register:all-services` to register on Nevermined
5. Add output env vars to `.env`

**Routes:**
- `GET /v1/services` - List all services
- `GET /v1/services/:id` - Service details
- `POST /v1/services/:id/execute` - Execute (x402-gated)
- `GET /v1/discover/sellers` - Find other marketplace agents
- `GET /v1/discover/buyers` - Find potential buyers
