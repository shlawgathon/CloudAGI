# CloudAGI

CloudAGI is a multi-service AI platform on the Nevermined marketplace. It sells GPU compute, neural search, web scraping, AI code review, and smart search — all paid via the x402 protocol.

## Architecture

```
CloudAGI/
├── backend/               # Bun API (TypeScript)
│   ├── src/
│   │   ├── index.ts       # HTTP router + all endpoints
│   │   ├── config.ts      # Env-based configuration
│   │   ├── services/      # Marketplace service handlers
│   │   │   ├── registry.ts
│   │   │   ├── init.ts
│   │   │   └── handlers/
│   │   │       ├── gpu-compute.ts   # Modal sandbox execution
│   │   │       ├── ai-research.ts   # Exa neural search
│   │   │       ├── web-scraper.ts   # Apify web scraping
│   │   │       ├── code-review.ts   # Claude code analysis
│   │   │       └── smart-search.ts  # Multi-source aggregator
│   │   ├── discovery/     # Nevermined Discovery API client
│   │   ├── payments/      # x402 verification + settlement
│   │   ├── jobs/          # Modal GPU job execution
│   │   ├── orders/        # Order state management
│   │   ├── orchestration/ # Trinity workflow adapter
│   │   └── scripts/       # Registration + deployment scripts
│   ├── .env.example       # Local dev env template
│   └── .env.production    # Production env template
├── web/                   # Next.js frontend
│   ├── app/
│   └── .env.example
└── reference/             # Nevermined hackathon examples (gitignored)
```

## Services

| Service | Route | Price | Requires |
|---------|-------|-------|----------|
| GPU Compute | `POST /v1/services/gpu-compute/execute` | 1 USDC | Modal auth |
| AI Research | `POST /v1/services/ai-research/execute` | 0.10 USDC | `EXA_API_KEY` |
| Web Scraper | `POST /v1/services/web-scraper/execute` | 0.20 USDC | `APIFY_API_TOKEN` |
| Code Review | `POST /v1/services/code-review/execute` | 0.50 USDC | `ANTHROPIC_API_KEY` |
| Smart Search | `POST /v1/services/smart-search/execute` | 0.05 USDC | `EXA_API_KEY` |

All service execution endpoints are gated by Nevermined x402 payments when configured.

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/v1/health` | Health check |
| GET | `/.well-known/agent.json` | A2A agent card (all services) |
| GET | `/v1/services` | Service catalog |
| GET | `/v1/services/:id` | Service details + pricing |

### Paid (x402)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/services/:id/execute` | Execute a service |
| POST | `/v1/orders/:id/start` | Start order (legacy flow) |

### Discovery

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/discover/sellers` | Find other Nevermined agents |
| GET | `/v1/discover/buyers` | Find potential buyers |

### Orders (legacy)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/orders` | Create order |
| GET | `/v1/orders/:id` | Get order status |
| GET | `/v1/orders/:id/logs` | Get logs |
| GET | `/v1/orders/:id/artifacts` | List artifacts |
| GET | `/v1/orders/:id/artifacts/:name` | Download artifact |

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/shlawgathon/CloudAGI.git
cd CloudAGI
```

### 2. Backend

```bash
cd backend
cp .env.example .env
bun install
bun run dev
```

Backend runs at http://localhost:3000

### 3. Frontend

In a second terminal:

```bash
cd web
cp .env.example .env.local
bun install
bun run dev
```

Frontend runs at http://localhost:3000 (Next.js proxies API calls to backend)

### 4. Verify

```bash
curl http://localhost:3000/v1/health
curl http://localhost:3000/v1/services
curl http://localhost:3000/.well-known/agent.json
```

## Environment Setup

### Backend (`backend/.env`)

Copy `backend/.env.example` and fill in your values:

```bash
cd backend
cp .env.example .env
```

**Required for basic operation:**
- `PORT`, `HOST`, `APP_BASE_URL`, `CORS_ORIGIN` — server config

**Required for Nevermined payments:**
- `NVM_API_KEY` — from https://nevermined.app > Settings > API Keys
- `NVM_BUILDER_ADDRESS` — your wallet address from Nevermined profile
- `NVM_PAYMENT_RAIL` — `fiat` (Stripe) or `crypto` (USDC)
- `NVM_AGENT_ID`, `NVM_PLAN_ID` — output of `bun run register:all-services`

**Per-service Nevermined IDs** (optional, falls back to default):
- `NVM_GPU_COMPUTE_AGENT_ID`, `NVM_GPU_COMPUTE_PLAN_ID`
- `NVM_AI_RESEARCH_AGENT_ID`, `NVM_AI_RESEARCH_PLAN_ID`
- `NVM_WEB_SCRAPER_AGENT_ID`, `NVM_WEB_SCRAPER_PLAN_ID`
- `NVM_CODE_REVIEW_AGENT_ID`, `NVM_CODE_REVIEW_PLAN_ID`
- `NVM_SMART_SEARCH_AGENT_ID`, `NVM_SMART_SEARCH_PLAN_ID`

**Sponsor API keys** (each enables its service):
- `EXA_API_KEY` — from https://exa.ai (enables AI Research + Smart Search)
- `APIFY_API_TOKEN` — from https://apify.com (enables Web Scraper)
- `ANTHROPIC_API_KEY` — from Anthropic (enables Code Review)

**Modal** (GPU compute):
- Auth via `~/.modal.toml` (run `modal token set` locally)
- Or set `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` in env

**Trinity** (orchestration, optional for service-only mode):
- `TRINITY_BASE_URL`, `TRINITY_API_KEY`, `TRINITY_SHARED_SECRET`

### Frontend (`web/.env.local`)

```bash
cd web
cp .env.example .env.local
```

- `BACKEND_URL=http://127.0.0.1:3000` — backend address for Next.js rewrites
- `NEXT_PUBLIC_API_BASE_URL=` — leave empty for local dev (uses proxy)

## Nevermined Registration

After setting `NVM_API_KEY` and `NVM_BUILDER_ADDRESS` in `backend/.env`:

```bash
cd backend

# Register all 5 services at once
bun run register:all-services
```

The script outputs agent/plan IDs for each service. Copy them into your `.env`:

```
NVM_GPU_COMPUTE_AGENT_ID=did:nv:abc...
NVM_GPU_COMPUTE_PLAN_ID=did:nv:def...
NVM_AI_RESEARCH_AGENT_ID=did:nv:ghi...
NVM_AI_RESEARCH_PLAN_ID=did:nv:jkl...
...
```

You can also register just the legacy single agent:

```bash
bun run register:nevermined
```

## Payment Flow

### Service execution (new)

1. Buyer discovers services via `GET /v1/services` or `GET /.well-known/agent.json`
2. Buyer orders the service's plan on Nevermined (fiat or crypto)
3. Buyer mints an x402 access token
4. Buyer calls `POST /v1/services/:id/execute` with `PAYMENT-SIGNATURE` header
5. CloudAGI verifies + settles payment, executes the service, returns results

### Order flow (legacy)

1. Customer creates order via `POST /v1/orders`
2. Customer pays via Nevermined
3. Customer calls `POST /v1/orders/:id/start` with `PAYMENT-SIGNATURE`
4. CloudAGI triggers Trinity workflow, runs agent steps in Modal sandboxes
5. Logs + artifacts available at order endpoints

## Adding a New Service

1. Create `backend/src/services/handlers/my-service.ts`:

```typescript
import { registerService } from "../registry";
import type { ServiceResult } from "../registry";

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  // Your service logic here
  return { success: true, data: { result: "..." } };
}

registerService({
  id: "my-service",
  name: "My Service",
  description: "What it does",
  category: "category",
  priceLabel: "0.10 USDC",
  priceAmount: "0.10",
  priceCurrency: "USDC",
  tags: ["tag1", "tag2"],
  handler,
});
```

2. Add import in `backend/src/services/init.ts`:
```typescript
import "./handlers/my-service";
```

3. Register on Nevermined:
```bash
cd backend && bun run register:all-services
```

4. Copy the output IDs to `.env`

## Production Deployment

### Backend (Docker on VPS)

```bash
cd backend
cp .env.production .env
# Fill in all <placeholder> values in .env
docker build -t cloudagi .
docker run --env-file .env -p 3000:3000 cloudagi
```

DNS: `api.cloudagi.org` -> VPS IP (Cloudflare proxied, handles SSL)

### Frontend (Vercel)

```bash
cd web
vercel --prod
```

Vercel env vars:
- `NEXT_PUBLIC_API_BASE_URL=https://api.cloudagi.org`
- `BACKEND_URL=https://api.cloudagi.org`

DNS: `cloudagi.org` -> `cname.vercel-dns.com` (Cloudflare proxied)

### Cloudflare Tunnel (dev)

For a temporary public backend URL:

```bash
cd backend
bun run dev:tunnel
```

The tunnel URL changes on restart. Update `APP_BASE_URL` in `.env` when it does.

## Validation

```bash
# Backend typecheck
cd backend && bun run typecheck

# Frontend typecheck + build
cd web && bun run typecheck && bun run build
```

## Scripts

| Script | Directory | Description |
|--------|-----------|-------------|
| `bun run dev` | `backend/` | Start backend dev server (port 3000) |
| `bun run typecheck` | `backend/` | TypeScript check |
| `bun run register:all-services` | `backend/` | Register all 5 services on Nevermined |
| `bun run register:nevermined` | `backend/` | Register single legacy agent |
| `bun run deploy:trinity` | `backend/` | Deploy Trinity system |
| `bun run dev:clear` | `backend/` | Kill stale listeners + tunnels |
| `bun run dev:tunnel` | `backend/` | Start Cloudflare tunnel |
| `bun run dev` | `web/` | Start frontend dev server |
| `bun run build` | `web/` | Build frontend for production |

## Current Limitations

- Order state is in-memory (restarting backend clears orders)
- Artifacts written to `data/artifacts/`
- Services without their API key return an error (graceful degradation)
- Real x402 transactions require valid Nevermined credentials + a reachable public URL

## Agents & Skills

See [`agents.md`](./agents.md) for the full guide to AI agent personas and skills. Key skill for Nevermined integration: `.claude/skills/nevermined-payments/SKILL.md`
