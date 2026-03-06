# CloudAGI

CloudAGI is a direct AI compute service. A customer creates an order, pays for access through Nevermined with a USDC-priced plan, CloudAGI runs the job on Modal, and the customer gets logs plus an artifact.

This repo implements the first transaction path. It is intentionally not a marketplace, not a provider network, and not a multi-tenant control plane.

## Stack

- Bun + TypeScript backend
- Modal JavaScript SDK for execution
- Nevermined Payments SDK for USDC-priced plans and x402 payment gating
- Next.js 16 + React + Tailwind + TypeScript frontend in [`web/`](/Users/xiao/CloudAGI/web)

## What Exists

- Marketing / order frontend in [`web/app/page.tsx`](/Users/xiao/CloudAGI/web/app/page.tsx)
- Order status frontend in [`web/app/orders/[id]/page.tsx`](/Users/xiao/CloudAGI/web/app/orders/[id]/page.tsx)
- Order creation endpoint: `POST /v1/orders`
- Order lookup endpoint: `GET /v1/orders/:id`
- Paid execution endpoint: `POST /v1/orders/:id/start`
- Logs endpoint: `GET /v1/orders/:id/logs`
- Artifact endpoints:
  - `GET /v1/orders/:id/artifacts`
  - `GET /v1/orders/:id/artifacts/:name`
- Agent discovery document: `GET /.well-known/agent.json`
- Nevermined registration script: `bun run register:nevermined`

## Repo Layout

```text
CloudAGI/
├── src/          # Bun API, Modal runner, Nevermined integration
├── web/          # Next.js frontend
├── docs/         # Product / implementation notes
├── .env          # Backend runtime config
└── web/.env.local  # Frontend runtime config
```

## Run Locally

You need two processes: backend and frontend.

### 1. Backend

From the repo root:

```bash
bun install
bun run dev
```

Backend URL:

- [http://localhost:3000](http://localhost:3000)

Useful backend routes:

- [http://localhost:3000/v1/health](http://localhost:3000/v1/health)
- [http://localhost:3000/.well-known/agent.json](http://localhost:3000/.well-known/agent.json)

### 2. Frontend

In a second terminal:

```bash
cd web
bun install
cp .env.example .env.local
bun run dev
```

Frontend URL:

- [http://localhost:3001](http://localhost:3001)

## Environment Files

### Backend env

The Bun API reads config from [`.env`](/Users/xiao/CloudAGI/.env).

Important backend variables:

- `PORT`
- `HOST`
- `APP_BASE_URL`
- `ADMIN_KEY`
- `MODAL_APP_NAME`
- `MODAL_IMAGE`
- `MODAL_ENVIRONMENT_NAME`
- `MODAL_GPU`
- `MODAL_TIMEOUT_SECS`
- `NVM_API_KEY`
- `NVM_ENVIRONMENT`
- `NVM_AGENT_ID`
- `NVM_PLAN_ID`
- `NVM_BUILDER_ADDRESS`
- `NVM_USDC_ADDRESS`

### Frontend env

The Next app reads config from [`web/.env.local`](/Users/xiao/CloudAGI/web/.env.example).

Important frontend variables:

- `BACKEND_URL=http://127.0.0.1:3000`
- `NEXT_PUBLIC_API_BASE_URL=`

Notes:

- If `NEXT_PUBLIC_API_BASE_URL` is empty, the frontend uses Next rewrites from [`web/next.config.ts`](/Users/xiao/CloudAGI/web/next.config.ts) and proxies `/api/*` to `BACKEND_URL`.
- For normal local development, the default `BACKEND_URL=http://127.0.0.1:3000` is correct.

## Modal Auth

CloudAGI uses the local Modal profile if one exists.

On this machine, Modal is already configured through `~/.modal.toml`, so local development does not need `MODAL_TOKEN_ID` or `MODAL_TOKEN_SECRET` in `.env`.

You only need explicit Modal env vars when running on a machine that does not already have a Modal profile configured.

## Nevermined Setup

The paid start endpoint depends on Nevermined.

If these are missing:

- `NVM_API_KEY`
- `NVM_AGENT_ID`
- `NVM_PLAN_ID`

then the app still boots, but `POST /v1/orders/:id/start` returns `503`.

To register the CloudAGI plan after filling the Nevermined values:

```bash
bun run register:nevermined
```

That script uses:

- the configured USDC token address in `NVM_USDC_ADDRESS`
- the receiving address in `NVM_BUILDER_ADDRESS`
- the current CloudAGI offer name and price from `.env`

## Payment Flow

1. Customer creates an order in the frontend.
2. Backend returns the order plus Nevermined plan metadata when configured.
3. Customer orders the plan using USDC.
4. Customer generates an x402 access token.
5. Customer calls `POST /v1/orders/:id/start` with `payment-signature`.
6. CloudAGI verifies and settles the payment through Nevermined.
7. CloudAGI launches the job on Modal.
8. Logs and artifacts are exposed through the order status page.

## Current Limitations

- Order state is in-memory. Restarting the backend clears orders.
- Artifacts are written to `data/artifacts/`.
- The backend is API-only; the UI now lives entirely in [`web/`](/Users/xiao/CloudAGI/web).
- A real paid transaction still requires valid Nevermined credentials, `NVM_AGENT_ID`, `NVM_PLAN_ID`, and a reachable public deployment URL.

## Validation Commands

Backend:

```bash
bun run typecheck
```

Frontend:

```bash
cd web
bun run typecheck
bun run build
```

## Important Files

- [`.env`](/Users/xiao/CloudAGI/.env)
- [`web/.env.example`](/Users/xiao/CloudAGI/web/.env.example)
- [`src/index.ts`](/Users/xiao/CloudAGI/src/index.ts)
- [`src/jobs/modal.ts`](/Users/xiao/CloudAGI/src/jobs/modal.ts)
- [`src/payments/nevermined.ts`](/Users/xiao/CloudAGI/src/payments/nevermined.ts)
- [`src/scripts/register-nevermined.ts`](/Users/xiao/CloudAGI/src/scripts/register-nevermined.ts)
- [`web/app/page.tsx`](/Users/xiao/CloudAGI/web/app/page.tsx)
- [`web/app/orders/[id]/page.tsx`](/Users/xiao/CloudAGI/web/app/orders/[id]/page.tsx)
- [`docs/plans/2026-03-06-cloudagi-first-transaction.md`](/Users/xiao/CloudAGI/docs/plans/2026-03-06-cloudagi-first-transaction.md)
