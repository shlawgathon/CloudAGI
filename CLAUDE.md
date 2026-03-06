# CloudAGI - Project Guide

## Available Agents

| Agent | File | When to Use |
|-------|------|-------------|
| Backend Architect | `.claude/agents/engineering-backend-architect.md` | Bun API design, system architecture, database schemas |
| Frontend Developer | `.claude/agents/engineering-frontend-developer.md` | Next.js pages, React components, Tailwind styling |
| AI Engineer | `.claude/agents/engineering-ai-engineer.md` | Modal GPU workloads, ML pipelines, model integration |
| DevOps Automator | `.claude/agents/engineering-devops-automator.md` | Docker, CI/CD, deployment, infrastructure |
| Rapid Prototyper | `.claude/agents/engineering-rapid-prototyper.md` | Fast iteration, hackathon-speed feature building |
| API Tester | `.claude/agents/testing-api-tester.md` | API validation, endpoint testing, load testing |
| Performance Benchmarker | `.claude/agents/testing-performance-benchmarker.md` | GPU performance profiling, latency benchmarks |
| Sprint Prioritizer | `.claude/agents/product-sprint-prioritizer.md` | Sprint planning, backlog grooming, task prioritization |
| Agents Orchestrator | `.claude/agents/agents-orchestrator.md` | Multi-agent coordination, complex workflows |

### How to Activate

**Claude Code:** Say "Activate Backend Architect mode" or "Use the Rapid Prototyper agent"
**Codex / Other agents:** Read the agent file first, e.g. "Read .claude/agents/engineering-rapid-prototyper.md and follow its instructions"

See `agents.md` at project root for the full cross-tool usage guide.

## Stack

- **Runtime:** Bun (TypeScript, ESM)
- **Backend:** `backend/src/index.ts` - Bun HTTP server on port 3000
- **Frontend:** `web/` - Next.js + React + Tailwind
- **GPU:** Modal serverless (`backend/src/jobs/modal.ts`) - JS SDK `modal` ^0.7.2
- **Payments:** Nevermined (`backend/src/payments/nevermined.ts`)
- **Orders:** `backend/src/orders/store.ts`, `backend/src/orders/types.ts`
- **Services:** `backend/src/services/` - Multi-service marketplace architecture

## Modal Configuration

Auth is in `~/.modal.toml` (machine-local, not committed).

Environment variables for Modal jobs:
- `MODAL_GPU` - GPU type (default: `T4`, options: `A10G`, `A100`, `H100`)
- `MODAL_TIMEOUT_SECS` - Job timeout in seconds
- `MODAL_IMAGE` - Base Docker image for Modal container

Skill reference: `.claude/skills/modal-serverless-gpu/`

## Key Source Files

```
backend/src/index.ts                          # API entrypoint (Bun server)
backend/src/config.ts                         # Shared configuration
backend/src/jobs/modal.ts                     # Modal GPU job definitions
backend/src/jobs/runner.ts                    # Job execution orchestrator
backend/src/payments/nevermined.ts            # Nevermined payment integration
backend/src/orders/store.ts                   # Order persistence
backend/src/orders/types.ts                   # Order type definitions
backend/src/services/registry.ts              # Multi-service registry
backend/src/services/init.ts                  # Service loader (imports all handlers)
backend/src/services/handlers/gpu-compute.ts  # GPU compute service (Modal)
backend/src/services/handlers/ai-research.ts  # Neural search service (Exa)
backend/src/services/handlers/web-scraper.ts  # Web scraping service (Apify)
backend/src/services/handlers/code-review.ts  # AI code review service (Claude)
backend/src/services/handlers/smart-search.ts # Multi-source search aggregator
backend/src/discovery/client.ts               # Nevermined Discovery API client
backend/src/scripts/register-all-services.ts  # Batch Nevermined registration
backend/src/scripts/                          # Utility scripts
web/                                          # Next.js frontend
```

## Nevermined Setup

### Credentials

1. Go to https://nevermined.app, sign in
2. Settings > API Keys > Generate Sandbox API key -> `NVM_API_KEY`
3. Profile > Wallet Address -> `NVM_BUILDER_ADDRESS`
4. Set `NVM_PAYMENT_RAIL=fiat` for Stripe or `crypto` for USDC

### Register Services

```bash
cd backend && bun run register:all-services   # Registers all 5 services
```

Copy the output agent/plan IDs into `.env`.

### Sponsor API Keys

- `EXA_API_KEY` - From https://exa.ai (neural search)
- `APIFY_API_TOKEN` - From https://apify.com (web scraping)
- `ANTHROPIC_API_KEY` - For code review service

### Service Architecture

Services are defined in `backend/src/services/handlers/`. Each handler calls `registerService()` on import. The `backend/src/services/init.ts` file imports all handlers.

| Service | Endpoint | Price |
|---------|----------|-------|
| GPU Compute | `POST /v1/services/gpu-compute/execute` | 1 USDC |
| AI Research | `POST /v1/services/ai-research/execute` | 0.10 USDC |
| Web Scraper | `POST /v1/services/web-scraper/execute` | 0.20 USDC |
| Code Review | `POST /v1/services/code-review/execute` | 0.50 USDC |
| Smart Search | `POST /v1/services/smart-search/execute` | 0.05 USDC |

### Discovery API

- `GET /v1/discover/sellers` - Find other Nevermined agents
- `GET /v1/discover/buyers` - Find potential customers
- `GET /.well-known/agent.json` - A2A agent card (lists all services)

### Adding a New Service

1. Create `backend/src/services/handlers/my-service.ts`
2. Call `registerService({ id, name, description, category, priceLabel, priceAmount, priceCurrency, tags, handler })`
3. Add import in `backend/src/services/init.ts`
4. Run `cd backend && bun run register:all-services`

Skill reference: `.claude/skills/nevermined-payments/SKILL.md`
Hackathon examples: `reference/nevermined-hackathons/`

## Validation Commands

```bash
cd backend && bun run typecheck    # TypeScript check (backend)
cd backend && bun run dev          # Start dev server (port 3000)
cd backend && bun run register:all-services  # Register on Nevermined
cd web && bun run build            # Build Next.js frontend
```

## Team Conventions

- **Dot-folders:** `.arya/`, `.chao/`, `.jerry/` for personal scratch space (gitignored)
- **Commits:** Conventional commits - `type(scope): description`
- **Branches:** `feature/`, `fix/`, `setup/` prefixes
- **Health check:** `GET /v1/health` on the backend
