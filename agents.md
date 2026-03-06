# CloudAGI Agents & Skills Guide

This project ships 9 curated AI agent personas and a Modal serverless GPU skill. They work across any AI coding tool that supports markdown-based agent instructions.

## Agents

All agents live in `.claude/agents/`. Each file defines a persona with expertise, workflow patterns, and domain-specific instructions.

| Agent | File | Use For |
|-------|------|---------|
| Backend Architect | `engineering-backend-architect.md` | Bun API routes, system design, database schemas, auth |
| Frontend Developer | `engineering-frontend-developer.md` | Next.js pages, React components, Tailwind, UI/UX |
| AI Engineer | `engineering-ai-engineer.md` | Modal GPU jobs, ML pipelines, model integration |
| DevOps Automator | `engineering-devops-automator.md` | Docker, CI/CD, deploys, infrastructure scripts |
| Rapid Prototyper | `engineering-rapid-prototyper.md` | Fast iteration, MVPs, hackathon-speed building |
| API Tester | `testing-api-tester.md` | Endpoint validation, load testing, contract testing |
| Performance Benchmarker | `testing-performance-benchmarker.md` | GPU perf profiling, latency benchmarks, bottlenecks |
| Sprint Prioritizer | `product-sprint-prioritizer.md` | Sprint planning, backlog grooming, task breakdown |
| Agents Orchestrator | `agents-orchestrator.md` | Multi-agent coordination, complex multi-step workflows |

## How to Use Agents

### Claude Code

Agents in `.claude/agents/` are auto-discovered. Activate by name:

```
Activate Backend Architect mode
Use the Rapid Prototyper agent
Switch to AI Engineer agent
```

### OpenAI Codex

Codex reads markdown instructions from the repo. Reference an agent directly:

```
Read .claude/agents/engineering-ai-engineer.md and follow its persona and instructions for the task.
```

Or paste the agent content into your system prompt / custom instructions.

### Cursor / Windsurf / Cline / Other Editors

These tools support custom rules or instruction files. You can:

1. **Copy-paste** the agent's content into the tool's custom instructions / rules panel
2. **Reference the file** in your prompt: "Follow the instructions in .claude/agents/engineering-backend-architect.md"
3. **Use the skill symlinks** - the Modal skill is symlinked into `.windsurf/`, `.crush/`, `.goose/`, `.kilocode/`, `.kiro/`, `.vibe/`, and `.agent/` directories for native tool integration

### Any AI Tool

Every agent is a self-contained markdown file. The pattern works everywhere:

1. Read the `.md` file for the agent you need
2. Include it as context / system instructions
3. Ask your question - the agent persona guides the response

## Skills

### Nevermined Payments

Location: `.claude/skills/nevermined-payments/SKILL.md`

**What it does:** Comprehensive guide for Nevermined marketplace integration - agent registration, payment plan creation, x402 payment verification/settlement, Discovery API, and A2A protocol.

**Use in prompts:**
```
Read .claude/skills/nevermined-payments/SKILL.md and help me register a new service on the Nevermined marketplace.
```

**Service development pattern:**
1. Create handler in `backend/src/services/handlers/`
2. Call `registerService()` with service metadata
3. Import in `backend/src/services/init.ts`
4. Run `cd backend && bun run register:all-services`

### Modal Serverless GPU

Location: `.agents/skills/modal-serverless-gpu/` (symlinked into each tool's directory)

**What it does:** Provides comprehensive guidance for running ML workloads on Modal's serverless GPU platform - deploying models as APIs, running batch jobs, GPU selection, performance optimization.

**Prerequisites:**
```bash
pipx install modal        # or: pip install modal
modal token set --token-id <ID> --token-secret <SECRET>
```

**Quick reference:**
- Skill docs: `.agents/skills/modal-serverless-gpu/SKILL.md`
- Advanced usage: `.agents/skills/modal-serverless-gpu/references/advanced-usage.md`
- Troubleshooting: `.agents/skills/modal-serverless-gpu/references/troubleshooting.md`

**GPU options:** T4 (16GB), L4 (24GB), A10G (24GB), L40S (48GB), A100 (40/80GB), H100 (80GB), H200 (141GB), B200

**Use in prompts:**
```
Read .agents/skills/modal-serverless-gpu/SKILL.md and help me deploy a model endpoint on Modal with an A10G GPU.
```

## Task-to-Agent Mapping

Not sure which agent to use? Here's a quick guide:

| Task | Agent |
|------|-------|
| "Add a new API endpoint" | Backend Architect |
| "Build a dashboard page" | Frontend Developer |
| "Deploy a model on Modal" | AI Engineer + Modal skill |
| "Set up GitHub Actions" | DevOps Automator |
| "Prototype this feature fast" | Rapid Prototyper |
| "Write tests for the API" | API Tester |
| "Profile GPU inference speed" | Performance Benchmarker |
| "Plan next sprint's work" | Sprint Prioritizer |
| "Coordinate multiple agents" | Agents Orchestrator |
| "Register a Nevermined agent" | Backend Architect + Nevermined skill |
| "Add a new marketplace service" | Backend Architect + Nevermined skill |
| "Debug payment flow" | API Tester + Nevermined skill |

## Team Setup

Each team member should configure Modal auth locally:
```bash
pipx install modal
modal token set --token-id <your-id> --token-secret <your-secret>
```

This writes `~/.modal.toml` which is machine-local and never committed to git.
