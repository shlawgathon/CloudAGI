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

Say: "Activate Backend Architect mode" or "Use the Rapid Prototyper agent"

## Stack

- **Runtime:** Bun (TypeScript, ESM)
- **Backend:** `src/index.ts` - Hono/Bun HTTP server on port 3001
- **Frontend:** `web/` - Next.js + React + Tailwind
- **GPU:** Modal serverless (`src/jobs/modal.ts`) - JS SDK `modal` ^0.7.2
- **Payments:** Nevermined (`src/payments/nevermined.ts`)
- **Orders:** `src/orders/store.ts`, `src/orders/types.ts`

## Modal Configuration

Auth is in `~/.modal.toml` (machine-local, not committed).

Environment variables for Modal jobs:
- `MODAL_GPU` - GPU type (default: `T4`, options: `A10G`, `A100`, `H100`)
- `MODAL_TIMEOUT_SECS` - Job timeout in seconds
- `MODAL_IMAGE` - Base Docker image for Modal container

Skill reference: `.claude/skills/modal-serverless-gpu/`

## Key Source Files

```
src/index.ts              # API entrypoint (Bun server)
src/config.ts             # Shared configuration
src/jobs/modal.ts         # Modal GPU job definitions
src/jobs/runner.ts        # Job execution orchestrator
src/payments/nevermined.ts # Nevermined payment integration
src/orders/store.ts       # Order persistence
src/orders/types.ts       # Order type definitions
src/scripts/              # Utility scripts
web/                      # Next.js frontend
```

## Validation Commands

```bash
bun run typecheck          # TypeScript check (backend)
bun run dev                # Start dev server (port 3001)
cd web && bun run build    # Build Next.js frontend
```

## Team Conventions

- **Dot-folders:** `.arya/`, `.chao/`, `.jerry/` for personal scratch space (gitignored)
- **Commits:** Conventional commits - `type(scope): description`
- **Branches:** `feature/`, `fix/`, `setup/` prefixes
- **Health check:** `GET /v1/health` on the backend
