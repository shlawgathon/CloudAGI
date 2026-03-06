# GPU Bazaar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a provider-agnostic GPU compute marketplace where agents buy container-minutes via Nevermined, and anyone can plug in their own hardware as a compute provider.

**Architecture:** CLI-first Bun/TypeScript API server with a provider abstraction layer (Modal, Docker, SSH). Nevermined handles all metering and payments. A React dashboard provides visual control. Mindra orchestrates 5+ specialized internal agents. Apify scrapes market pricing. ZeroClick serves sponsored compute recommendations. Ability/Trinity defines agent workflows.

**Tech Stack:** TypeScript, Bun, Docker, Modal SDK, Nevermined Payments SDK, React + Tailwind, Mindra API, Apify Actors, ZeroClick SDK, Ability TrinityOS

---

## Prize Targets

| Prize | Amount | How GPU Bazaar Wins It |
|-------|--------|----------------------|
| Best Autonomous Seller | $1,000 | Metered compute sold to 2+ teams, 3+ transactions, dynamic pricing logic |
| Best Autonomous Buyer | $1,000 + $3,000 global | Our buyer agent purchases services from 2+ teams with ROI evaluation and repeat/switch behavior |
| Most Interconnected Agents | $1,000 | Hub of the agent economy — everyone needs compute. Buy AND sell across teams |
| Mindra | $2,000 | 5+ specialized agents (Discovery, Pricing, Allocation, Monitor, Billing, Onboarding) with hierarchical orchestration |
| ZeroClick | $2,000 | Sponsored compute recommendations in pricing/discovery responses |
| Apify | $600+ | Apify actors scrape real-time GPU market pricing to feed dynamic pricing engine |
| Ability | $2,000 | Trinity YAML workflows define agent coordination patterns |

**Total potential: $12,600**

---

## System Architecture

```
                          ┌──────────────────┐
                          │   Other Teams'   │
                          │   Buyer Agents   │
                          └────────┬─────────┘
                                   │ x402 access token
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      GPU BAZAAR                              │
│                                                              │
│  ┌─────────┐   ┌──────────────────┐   ┌──────────────────┐ │
│  │  CLI     │   │  Bun API Server  │   │  React Dashboard │ │
│  │  gpubz   │──▶│  /v1/*           │◀──│  localhost:5173  │ │
│  └─────────┘   └────────┬─────────┘   └──────────────────┘ │
│                          │                                   │
│  ┌───────────────────────┼───────────────────────┐          │
│  │  Mindra Multi-Agent Orchestration             │          │
│  │                                               │          │
│  │  Orchestrator Agent                           │          │
│  │    ├─ Discovery Agent  (finds providers)      │          │
│  │    ├─ Pricing Agent    (dynamic pricing)      │          │
│  │    ├─ Allocation Agent (picks best provider)  │          │
│  │    ├─ Monitor Agent    (health + usage)       │          │
│  │    ├─ Billing Agent    (Nevermined metering)  │          │
│  │    └─ Onboarding Agent (registers new nodes)  │          │
│  └───────────────────────┼───────────────────────┘          │
│                          │                                   │
│       ┌──────────────────┼──────────────────┐               │
│       ▼                  ▼                  ▼               │
│  ┌──────────┐     ┌──────────┐       ┌──────────┐          │
│  │  Modal   │     │  Docker  │       │  SSH     │          │
│  │  Provider│     │  Provider│       │  Provider│          │
│  │  (cloud) │     │  (local) │       │  (remote)│          │
│  └──────────┘     └──────────┘       └──────────┘          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Sponsor Integrations                                  │ │
│  │  ├─ Nevermined: credits plan, x402 auth, metering     │ │
│  │  ├─ Mindra: 6-agent orchestration layer               │ │
│  │  ├─ ZeroClick: sponsored listings in /v1/pricing      │ │
│  │  ├─ Apify: scrape GPU market prices for pricing agent │ │
│  │  └─ Ability/Trinity: YAML workflow definitions        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Container Lifecycle Flow

```
Buyer Agent                GPU Bazaar API              Provider (Modal/Docker)
    │                           │                           │
    │  POST /v1/containers      │                           │
    │  + x402 access token      │                           │
    │  { gpu: "T4", min: 10 }   │                           │
    │ ─────────────────────────▶│                           │
    │                           │  validate token           │
    │                           │  (Nevermined SDK)         │
    │                           │                           │
    │                           │  Allocation Agent picks   │
    │                           │  best provider            │
    │                           │                           │
    │                           │  spawnContainer()         │
    │                           │──────────────────────────▶│
    │                           │                           │
    │                           │  { sessionId, accessUrl } │
    │                           │◀──────────────────────────│
    │                           │                           │
    │  { sessionId, accessUrl,  │                           │
    │    expiresAt }            │                           │
    │ ◀─────────────────────────│                           │
    │                           │                           │
    │  POST /v1/containers/:id  │                           │
    │  /exec { cmd: "..." }     │                           │
    │ ─────────────────────────▶│  exec(cmd)               │
    │                           │──────────────────────────▶│
    │                           │  { stdout, stderr, code } │
    │  { stdout, stderr, code } │◀──────────────────────────│
    │ ◀─────────────────────────│                           │
    │                           │                           │
    │       ... (metering ticks every 60s) ...              │
    │                           │                           │
    │                           │  credits exhausted OR     │
    │                           │  time expired             │
    │                           │  terminate()              │
    │                           │──────────────────────────▶│
    │                           │                           │
```

## Provider Interface (the core abstraction)

```typescript
// src/providers/interface.ts

interface ContainerRequest {
  gpu?: "T4" | "A10G" | "A100" | "none";
  memoryGB: number;
  image?: string;          // Docker image, default "python:3.11"
  timeoutMinutes: number;  // Max rental duration
  region?: string;         // Preferred region
}

interface ContainerSession {
  sessionId: string;
  providerId: string;
  accessUrl: string;       // HTTP endpoint into the container
  status: "starting" | "running" | "stopped" | "error";
  startedAt: Date;
  expiresAt: Date;
  gpu: string;
  memoryGB: number;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

interface ProviderHealth {
  online: boolean;
  availableSlots: number;
  gpuTypes: string[];
  region: string;
  latencyMs: number;
}

interface ComputeProvider {
  id: string;
  name: string;
  type: "modal" | "docker" | "ssh";
  capabilities: {
    gpuTypes: string[];
    maxMemoryGB: number;
    maxConcurrent: number;
    region: string;
  };

  spawnContainer(req: ContainerRequest): Promise<ContainerSession>;
  execCommand(sessionId: string, cmd: string[]): Promise<ExecResult>;
  getStatus(sessionId: string): Promise<ContainerSession>;
  terminate(sessionId: string): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
}
```

## API Endpoints (v1)

```
# Container Management
POST   /v1/containers              Create a new container rental
GET    /v1/containers              List all active containers
GET    /v1/containers/:id          Get container status
POST   /v1/containers/:id/exec    Execute command in container
DELETE /v1/containers/:id          Terminate container early

# Provider Management
GET    /v1/providers               List all compute nodes
POST   /v1/providers/register      Register new compute node
GET    /v1/providers/:id/health    Health check a specific node
DELETE /v1/providers/:id           Remove a node

# Marketplace
GET    /v1/pricing                 Current pricing by GPU type (+ ZeroClick ads)
GET    /v1/catalog                 Available GPU types and capacity
GET    /v1/usage                   Usage stats, revenue, billing history

# Health
GET    /v1/health                  API server health
GET    /v1/version                 API version info
```

All endpoints behind `/v1/containers` and `/v1/containers/:id/exec` require a Nevermined x402 access token in the `payment-signature` header.

## CLI Commands

```bash
# Start the server
gpubz serve --port 3000

# Provider management
gpubz provider add modal --token $MODAL_TOKEN
gpubz provider add docker --host 192.168.1.50 --port 2375
gpubz provider add ssh --host 192.168.1.100 --user gpu --key ~/.ssh/id_rsa
gpubz provider list
gpubz provider health
gpubz provider remove <id>

# Container management (for testing / direct use)
gpubz run --gpu T4 --minutes 10 --image python:3.11
gpubz exec <session-id> "nvidia-smi"
gpubz status <session-id>
gpubz stop <session-id>
gpubz ls

# Dashboard
gpubz dashboard          # Opens React dashboard in browser

# Nevermined registration
gpubz register           # Register service on Nevermined marketplace
gpubz earnings           # Show revenue summary
```

## File Structure

```
gpu-bazaar/
├── agents.md                          # Agent-readable API docs
├── README.md                          # Human-readable project docs
├── package.json
├── tsconfig.json
├── bunfig.toml
├── Dockerfile                         # API server container
├── docker-compose.yml                 # Local dev: API + dashboard
├── .env.example
│
├── src/
│   ├── index.ts                       # Bun server entry point
│   ├── config.ts                      # Env vars, defaults
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── containers.ts          # Container CRUD + exec
│   │       ├── providers.ts           # Provider registration
│   │       ├── pricing.ts             # Pricing + ZeroClick integration
│   │       ├── catalog.ts             # Available capacity
│   │       ├── usage.ts               # Usage stats
│   │       └── health.ts              # Health + version
│   │
│   ├── providers/
│   │   ├── interface.ts               # ComputeProvider types
│   │   ├── registry.ts               # Provider registry (in-memory store)
│   │   ├── modal.ts                   # Modal implementation
│   │   ├── docker.ts                  # Docker implementation
│   │   └── ssh.ts                     # SSH implementation (stretch)
│   │
│   ├── payments/
│   │   ├── nevermined.ts              # Nevermined SDK init + plan registration
│   │   ├── metering.ts               # Credit deduction per minute
│   │   └── middleware.ts              # x402 token validation middleware
│   │
│   ├── scheduler/
│   │   ├── allocator.ts               # Pick best provider for request
│   │   └── monitor.ts                # Tick every 60s, deduct credits, auto-terminate
│   │
│   ├── integrations/
│   │   ├── mindra.ts                  # Mindra multi-agent setup
│   │   ├── zeroclick.ts              # ZeroClick ad enrichment
│   │   ├── apify.ts                   # GPU market price scraping
│   │   └── ability.ts                # Trinity workflow definitions
│   │
│   └── cli/
│       ├── index.ts                   # CLI entry (commander.js)
│       ├── serve.ts                   # gpubz serve
│       ├── provider.ts               # gpubz provider *
│       ├── run.ts                     # gpubz run
│       ├── register.ts               # gpubz register
│       └── dashboard.ts              # gpubz dashboard
│
├── dashboard/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── api.ts                     # API client for /v1/*
│       ├── pages/
│       │   ├── Network.tsx            # Provider nodes overview
│       │   ├── Containers.tsx         # Active container sessions
│       │   ├── Revenue.tsx            # Earnings + usage charts
│       │   └── Settings.tsx           # Add/remove providers
│       └── components/
│           ├── NodeCard.tsx           # Single provider node display
│           ├── ContainerRow.tsx       # Single container row
│           ├── UsageChart.tsx         # Revenue over time
│           ├── StatusBadge.tsx        # Online/offline/starting
│           └── Layout.tsx             # Sidebar + header
│
├── workflows/                         # Ability/Trinity YAML workflows
│   ├── container-lifecycle.yaml
│   └── provider-onboarding.yaml
│
└── docs/
    ├── plans/
    │   └── 2026-03-06-gpu-bazaar.md   # This file
    └── api/                            # Mintlify docs (Day 2)
        └── mint.json
```

---

## Implementation Tasks

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `bunfig.toml`, `.env.example`, `.gitignore`

**Step 1: Initialize Bun project**

```bash
mkdir gpu-bazaar && cd gpu-bazaar
bun init -y
```

**Step 2: Install core dependencies**

```bash
bun add @nevermined-io/payments modal commander chalk
bun add -d typescript @types/bun
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create .env.example**

```env
# Nevermined
NVM_API_KEY=
NVM_ENVIRONMENT=sandbox

# Modal
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=

# Server
PORT=3000
HOST=0.0.0.0

# Optional: Mindra
MINDRA_API_KEY=

# Optional: ZeroClick
ZEROCLICK_API_KEY=

# Optional: Apify
APIFY_TOKEN=
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.env
*.log
```

**Step 6: Commit**

```bash
git init
git add package.json tsconfig.json bunfig.toml .env.example .gitignore
git commit -m "chore: scaffold gpu-bazaar project"
```

---

### Task 2: Provider Interface + In-Memory Registry

**Files:**
- Create: `src/providers/interface.ts`
- Create: `src/providers/registry.ts`

**Step 1: Write provider interface**

Create `src/providers/interface.ts` with the full `ComputeProvider`, `ContainerRequest`, `ContainerSession`, `ExecResult`, `ProviderHealth` types as defined in the architecture section above.

**Step 2: Write provider registry**

```typescript
// src/providers/registry.ts
import type { ComputeProvider, ContainerSession } from "./interface";

class ProviderRegistry {
  private providers: Map<string, ComputeProvider> = new Map();
  private sessions: Map<string, ContainerSession> = new Map();

  register(provider: ComputeProvider): void {
    this.providers.set(provider.id, provider);
  }

  remove(id: string): boolean {
    return this.providers.delete(id);
  }

  get(id: string): ComputeProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): ComputeProvider[] {
    return Array.from(this.providers.values());
  }

  storeSession(session: ContainerSession): void {
    this.sessions.set(session.sessionId, session);
  }

  getSession(sessionId: string): ContainerSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): ContainerSession[] {
    return Array.from(this.sessions.values());
  }

  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const registry = new ProviderRegistry();
```

**Step 3: Commit**

```bash
git add src/providers/
git commit -m "feat: add provider interface and in-memory registry"
```

---

### Task 3: Modal Provider Implementation

**Files:**
- Create: `src/providers/modal.ts`

**Step 1: Implement Modal provider**

Uses the `modal` npm package. Creates sandboxes with GPU specs, executes commands via `sb.exec()`, manages lifecycle. Key implementation:

```typescript
// src/providers/modal.ts
import { ModalClient } from "modal";
import type {
  ComputeProvider, ContainerRequest, ContainerSession,
  ExecResult, ProviderHealth
} from "./interface";

export class ModalProvider implements ComputeProvider {
  id: string;
  name: string;
  type: "modal" as const;
  capabilities: { gpuTypes: string[]; maxMemoryGB: number; maxConcurrent: number; region: string };

  private client: ModalClient;
  private sandboxes: Map<string, any> = new Map(); // Modal sandbox instances

  constructor(config: { tokenId: string; tokenSecret: string }) {
    this.id = "modal-default";
    this.name = "Modal Cloud";
    this.type = "modal";
    this.capabilities = {
      gpuTypes: ["T4", "A10G", "A100"],
      maxMemoryGB: 64,
      maxConcurrent: 5,
      region: "us"
    };
    this.client = new ModalClient();
  }

  async spawnContainer(req: ContainerRequest): Promise<ContainerSession> {
    const app = await this.client.apps.lookupOrCreate("gpu-bazaar", { createIfMissing: true });
    const image = { pythonVersion: "3.11" }; // Base image

    const sb = await this.client.sandboxes.create({
      app,
      image,
      gpu: req.gpu !== "none" ? req.gpu : undefined,
      timeoutSecs: req.timeoutMinutes * 60,
      command: ["sleep", "infinity"],
    });

    const sessionId = sb.sandboxId;
    this.sandboxes.set(sessionId, sb);

    const session: ContainerSession = {
      sessionId,
      providerId: this.id,
      accessUrl: `modal://${sessionId}`,
      status: "running",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + req.timeoutMinutes * 60_000),
      gpu: req.gpu || "none",
      memoryGB: req.memoryGB,
    };
    return session;
  }

  async execCommand(sessionId: string, cmd: string[]): Promise<ExecResult> {
    const sb = this.sandboxes.get(sessionId);
    if (!sb) throw new Error(`Sandbox ${sessionId} not found`);

    const start = Date.now();
    const process = await sb.exec(...cmd);
    const stdout = await process.stdout.read();
    const stderr = await process.stderr.read();

    return {
      stdout: stdout?.toString() || "",
      stderr: stderr?.toString() || "",
      exitCode: process.returnCode ?? 1,
      durationMs: Date.now() - start,
    };
  }

  async getStatus(sessionId: string): Promise<ContainerSession> {
    const sb = this.sandboxes.get(sessionId);
    if (!sb) throw new Error(`Sandbox ${sessionId} not found`);
    // Return stored session with live status
    return { sessionId, providerId: this.id, accessUrl: "", status: "running", startedAt: new Date(), expiresAt: new Date(), gpu: "T4", memoryGB: 8 };
  }

  async terminate(sessionId: string): Promise<void> {
    const sb = this.sandboxes.get(sessionId);
    if (sb) {
      await sb.terminate();
      this.sandboxes.delete(sessionId);
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      online: true,
      availableSlots: this.capabilities.maxConcurrent - this.sandboxes.size,
      gpuTypes: this.capabilities.gpuTypes,
      region: this.capabilities.region,
      latencyMs: 0,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/providers/modal.ts
git commit -m "feat: implement Modal compute provider"
```

---

### Task 4: Docker Provider Implementation

**Files:**
- Create: `src/providers/docker.ts`

**Step 1: Implement Docker provider**

Uses `child_process` to shell out to `docker` CLI on the host. Works for local machines (Linux server, Raspberry Pi) that have Docker installed. Provider connects via Docker socket (local) or TCP (remote).

```typescript
// src/providers/docker.ts
import { $ } from "bun";
import { randomUUID } from "crypto";
import type {
  ComputeProvider, ContainerRequest, ContainerSession,
  ExecResult, ProviderHealth
} from "./interface";

export class DockerProvider implements ComputeProvider {
  id: string;
  name: string;
  type: "docker" as const;
  capabilities: { gpuTypes: string[]; maxMemoryGB: number; maxConcurrent: number; region: string };
  private dockerHost: string;

  constructor(config: { id?: string; name?: string; host?: string; gpuTypes?: string[]; maxMemoryGB?: number; region?: string }) {
    this.id = config.id || `docker-${randomUUID().slice(0, 8)}`;
    this.name = config.name || "Local Docker";
    this.type = "docker";
    this.dockerHost = config.host || "unix:///var/run/docker.sock";
    this.capabilities = {
      gpuTypes: config.gpuTypes || ["none"],
      maxMemoryGB: config.maxMemoryGB || 8,
      maxConcurrent: 3,
      region: config.region || "local",
    };
  }

  async spawnContainer(req: ContainerRequest): Promise<ContainerSession> {
    const sessionId = `gpubz-${randomUUID().slice(0, 12)}`;
    const image = req.image || "python:3.11-slim";
    const gpuFlag = req.gpu && req.gpu !== "none" ? "--gpus all" : "";
    const memFlag = `--memory=${req.memoryGB}g`;

    await $`docker -H ${this.dockerHost} run -d --name ${sessionId} ${gpuFlag} ${memFlag} ${image} sleep infinity`.quiet();

    return {
      sessionId,
      providerId: this.id,
      accessUrl: `docker://${sessionId}`,
      status: "running",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + req.timeoutMinutes * 60_000),
      gpu: req.gpu || "none",
      memoryGB: req.memoryGB,
    };
  }

  async execCommand(sessionId: string, cmd: string[]): Promise<ExecResult> {
    const start = Date.now();
    const result = await $`docker -H ${this.dockerHost} exec ${sessionId} ${cmd.join(" ")}`.quiet().nothrow();

    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
      durationMs: Date.now() - start,
    };
  }

  async getStatus(sessionId: string): Promise<ContainerSession> {
    const result = await $`docker -H ${this.dockerHost} inspect ${sessionId} --format '{{.State.Status}}'`.quiet().nothrow();
    const dockerStatus = result.stdout.toString().trim();
    const status = dockerStatus === "running" ? "running" : "stopped";

    return {
      sessionId, providerId: this.id, accessUrl: `docker://${sessionId}`,
      status, startedAt: new Date(), expiresAt: new Date(), gpu: "none", memoryGB: 8,
    };
  }

  async terminate(sessionId: string): Promise<void> {
    await $`docker -H ${this.dockerHost} rm -f ${sessionId}`.quiet().nothrow();
  }

  async healthCheck(): Promise<ProviderHealth> {
    const result = await $`docker -H ${this.dockerHost} info --format '{{.ContainersRunning}}'`.quiet().nothrow();
    return {
      online: result.exitCode === 0,
      availableSlots: this.capabilities.maxConcurrent,
      gpuTypes: this.capabilities.gpuTypes,
      region: this.capabilities.region,
      latencyMs: 0,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/providers/docker.ts
git commit -m "feat: implement Docker compute provider"
```

---

### Task 5: Allocation Scheduler

**Files:**
- Create: `src/scheduler/allocator.ts`
- Create: `src/scheduler/monitor.ts`

**Step 1: Write the allocator** — picks the best provider for a container request based on: GPU availability, current load, region preference.

```typescript
// src/scheduler/allocator.ts
import { registry } from "../providers/registry";
import type { ContainerRequest, ComputeProvider } from "../providers/interface";

export async function allocate(req: ContainerRequest): Promise<ComputeProvider> {
  const providers = registry.listProviders();
  const candidates: { provider: ComputeProvider; score: number }[] = [];

  for (const provider of providers) {
    const health = await provider.healthCheck();
    if (!health.online || health.availableSlots <= 0) continue;

    let score = 0;
    // Has the requested GPU?
    const gpuNeeded = req.gpu || "none";
    if (gpuNeeded === "none" || provider.capabilities.gpuTypes.includes(gpuNeeded)) {
      score += 10;
    } else {
      continue; // Cannot fulfill GPU requirement
    }
    // Has enough memory?
    if (provider.capabilities.maxMemoryGB >= req.memoryGB) {
      score += 5;
    } else {
      continue;
    }
    // Region match bonus
    if (req.region && provider.capabilities.region === req.region) {
      score += 3;
    }
    // Availability bonus (more slots = higher score)
    score += health.availableSlots;

    candidates.push({ provider, score });
  }

  if (candidates.length === 0) {
    throw new Error("No providers available for this request");
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].provider;
}
```

**Step 2: Write the monitor** — ticks every 60s, deducts credits, auto-terminates expired containers.

```typescript
// src/scheduler/monitor.ts
import { registry } from "../providers/registry";
import { deductCredits, getBalance } from "../payments/metering";

let intervalId: Timer | null = null;

export function startMonitor() {
  intervalId = setInterval(async () => {
    const sessions = registry.listSessions();
    for (const session of sessions) {
      if (session.status !== "running") continue;

      // Check if expired
      if (new Date() >= session.expiresAt) {
        const provider = registry.get(session.providerId);
        if (provider) {
          await provider.terminate(session.sessionId);
          session.status = "stopped";
          registry.storeSession(session);
        }
        continue;
      }

      // Deduct 1 credit per minute
      try {
        await deductCredits(session.sessionId, 1);
      } catch (err) {
        // Out of credits — terminate
        const provider = registry.get(session.providerId);
        if (provider) {
          await provider.terminate(session.sessionId);
          session.status = "stopped";
          registry.storeSession(session);
        }
      }
    }
  }, 60_000);
}

export function stopMonitor() {
  if (intervalId) clearInterval(intervalId);
}
```

**Step 3: Commit**

```bash
git add src/scheduler/
git commit -m "feat: add allocation scheduler and usage monitor"
```

---

### Task 6: Nevermined Payment Integration

**Files:**
- Create: `src/payments/nevermined.ts`
- Create: `src/payments/metering.ts`
- Create: `src/payments/middleware.ts`

**Step 1: Write Nevermined SDK wrapper**

```typescript
// src/payments/nevermined.ts
import { Payments } from "@nevermined-io/payments";

let payments: Payments;

export function initPayments() {
  payments = Payments.getInstance({
    nvmApiKey: process.env.NVM_API_KEY!,
    environment: (process.env.NVM_ENVIRONMENT || "sandbox") as any,
  });
  return payments;
}

export function getPayments(): Payments {
  if (!payments) throw new Error("Payments not initialized. Call initPayments() first.");
  return payments;
}

// Register GPU Bazaar as a seller on Nevermined
export async function registerService() {
  const p = getPayments();

  const agentMetadata = {
    name: "GPU Bazaar",
    description: "Provider-agnostic GPU compute marketplace. Rent container-minutes on T4, A10G, A100 GPUs.",
    tags: ["gpu", "compute", "containers", "marketplace"],
  };

  const agentApi = {
    endpoints: [
      { "POST": `${process.env.HOST || "http://localhost"}:${process.env.PORT || 3000}/v1/containers` },
      { "GET": `${process.env.HOST || "http://localhost"}:${process.env.PORT || 3000}/v1/pricing` },
      { "GET": `${process.env.HOST || "http://localhost"}:${process.env.PORT || 3000}/v1/catalog` },
    ],
  };

  const planMetadata = { name: "GPU Bazaar Compute Credits" };

  // 1 credit = 1 container-minute
  // Price: set to appropriate amount per credit
  const creditsConfig = p.plans.getFixedCreditsConfig(1000n); // 1000 credits per plan purchase

  const result = await p.agents.registerAgentAndPlan(
    agentMetadata,
    agentApi,
    planMetadata,
    {} as any, // Price config — configure based on Nevermined sandbox setup
    creditsConfig,
    "credits"
  );

  console.log(`Registered on Nevermined: agentId=${result.agentId}, planId=${result.planId}`);
  return result;
}
```

**Step 2: Write metering module**

```typescript
// src/payments/metering.ts

// In-memory credit balances per session (simplified for hackathon)
// In production, this queries Nevermined's balance API
const sessionCredits: Map<string, number> = new Map();

export function initSession(sessionId: string, credits: number) {
  sessionCredits.set(sessionId, credits);
}

export async function deductCredits(sessionId: string, amount: number) {
  const current = sessionCredits.get(sessionId);
  if (current === undefined) throw new Error(`No credits for session ${sessionId}`);
  if (current < amount) throw new Error(`Insufficient credits: ${current} < ${amount}`);
  sessionCredits.set(sessionId, current - amount);
}

export function getBalance(sessionId: string): number {
  return sessionCredits.get(sessionId) || 0;
}

export function getAllBalances(): Map<string, number> {
  return new Map(sessionCredits);
}
```

**Step 3: Write auth middleware**

```typescript
// src/payments/middleware.ts

export async function validatePayment(req: Request): Promise<{ valid: boolean; credits: number }> {
  const paymentSig = req.headers.get("payment-signature");

  if (!paymentSig) {
    return { valid: false, credits: 0 };
  }

  // Validate via Nevermined x402
  // For hackathon: accept valid tokens and grant credits based on plan
  // TODO: integrate getPayments().x402.validateAccessToken()
  try {
    // Simplified: if token present, grant 60 credits (60 minutes)
    return { valid: true, credits: 60 };
  } catch {
    return { valid: false, credits: 0 };
  }
}
```

**Step 4: Commit**

```bash
git add src/payments/
git commit -m "feat: add Nevermined payment integration with metering"
```

---

### Task 7: Bun API Server

**Files:**
- Create: `src/index.ts`
- Create: `src/config.ts`
- Create: `src/api/v1/containers.ts`
- Create: `src/api/v1/providers.ts`
- Create: `src/api/v1/pricing.ts`
- Create: `src/api/v1/health.ts`

**Step 1: Write config**

```typescript
// src/config.ts
export const config = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  nvmApiKey: process.env.NVM_API_KEY || "",
  nvmEnvironment: process.env.NVM_ENVIRONMENT || "sandbox",
  modalTokenId: process.env.MODAL_TOKEN_ID || "",
  modalTokenSecret: process.env.MODAL_TOKEN_SECRET || "",
  version: "0.1.0",
};
```

**Step 2: Write route handlers**

Each route file exports handler functions that operate on the registry and providers. The containers handler validates payment via middleware, allocates a provider, spawns the container, initializes metering credits, and returns the session.

**Step 3: Write main server entry point**

```typescript
// src/index.ts
import { config } from "./config";
import { initPayments } from "./payments/nevermined";
import { startMonitor } from "./scheduler/monitor";
import { registry } from "./providers/registry";
// Route handlers imported here

const server = Bun.serve({
  port: config.port,
  hostname: config.host,

  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers for dashboard
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, payment-signature",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Route matching
    if (path === "/v1/health" && method === "GET") {
      return Response.json({ status: "ok", version: config.version }, { headers: corsHeaders });
    }

    if (path === "/v1/providers" && method === "GET") {
      // return provider list
    }

    if (path === "/v1/containers" && method === "POST") {
      // validate payment, allocate, spawn
    }

    // ... additional routes

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  },
});

// Initialize
initPayments();
startMonitor();
console.log(`GPU Bazaar running on http://${config.host}:${config.port}`);
```

**Step 4: Commit**

```bash
git add src/index.ts src/config.ts src/api/
git commit -m "feat: add Bun API server with v1 routes"
```

---

### Task 8: CLI Tool

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/serve.ts`
- Create: `src/cli/provider.ts`
- Create: `src/cli/run.ts`

**Step 1: Set up commander-based CLI**

The CLI wraps the API server and provides direct access to provider management. `gpubz serve` starts the Bun server. `gpubz provider add modal` registers a Modal provider. `gpubz run` creates a container via the local API.

**Step 2: Add bin entry to package.json**

```json
{
  "bin": {
    "gpubz": "./src/cli/index.ts"
  }
}
```

**Step 3: Commit**

```bash
git add src/cli/ package.json
git commit -m "feat: add gpubz CLI tool"
```

---

### Task 9: agents.md

**Files:**
- Create: `agents.md`

**Step 1: Write agent-readable documentation**

```markdown
# GPU Bazaar — Agent API Documentation

## What is GPU Bazaar?
GPU Bazaar is a compute marketplace. You can rent GPU containers
by the minute. Send a request, get an isolated container, run
your workloads, pay per minute via Nevermined credits.

## Authentication
All /v1/containers endpoints require a Nevermined x402 access token.
1. Purchase a GPU Bazaar credits plan on Nevermined
2. Get an x402 access token for your plan
3. Include it as `payment-signature` header in all requests

## Endpoints

### POST /v1/containers
Create a new container rental.

Request:
  POST /v1/containers
  Headers: { "payment-signature": "<x402_token>" }
  Body: {
    "gpu": "T4",           // T4, A10G, A100, or "none"
    "memoryGB": 8,          // RAM in GB
    "timeoutMinutes": 10,   // Max rental duration
    "image": "python:3.11"  // Docker image (optional)
  }

Response:
  {
    "sessionId": "abc-123",
    "accessUrl": "modal://abc-123",
    "status": "running",
    "expiresAt": "2026-03-06T15:30:00Z"
  }

### POST /v1/containers/:id/exec
Run a command inside your rented container.

Request:
  POST /v1/containers/abc-123/exec
  Headers: { "payment-signature": "<x402_token>" }
  Body: { "cmd": ["python", "-c", "print('hello')"] }

Response:
  {
    "stdout": "hello\n",
    "stderr": "",
    "exitCode": 0,
    "durationMs": 150
  }

### DELETE /v1/containers/:id
Terminate a container early (remaining credits refunded).

### GET /v1/pricing
Current pricing by GPU type.

Response:
  {
    "T4":   { "creditsPerMinute": 1, "available": 3 },
    "A10G": { "creditsPerMinute": 2, "available": 2 },
    "A100": { "creditsPerMinute": 5, "available": 1 }
  }

### GET /v1/catalog
All available compute capacity across all providers.

### GET /v1/health
Server health check.

## Error Codes
- 402: Payment required (missing or invalid x402 token)
- 404: Container or provider not found
- 503: No providers available for requested GPU type

## Version
Current: v0.1.0
All endpoints are prefixed with /v1/
```

**Step 2: Commit**

```bash
git add agents.md
git commit -m "docs: add agents.md for agent-readable API documentation"
```

---

### Task 10: React Dashboard

**Files:**
- Create: `dashboard/` directory with Vite + React + Tailwind setup

**Step 1: Scaffold React app**

```bash
cd dashboard
bun create vite . --template react-ts
bun add tailwindcss @tailwindcss/vite
```

**Step 2: Build four pages**

- **Network.tsx**: Fetches `GET /v1/providers`, shows each node as a card with name, type (Modal/Docker), GPU types, available slots, status badge (green/red), region tag. Polls every 10s.

- **Containers.tsx**: Fetches `GET /v1/containers`, shows a table with session ID, buyer, GPU, time remaining (countdown), provider, status badge, and a terminate button that calls `DELETE /v1/containers/:id`.

- **Revenue.tsx**: Fetches `GET /v1/usage`, shows total credits earned, total container-minutes sold, top buyers, and a simple bar chart of usage over time using recharts.

- **Settings.tsx**: Form to register a new provider — dropdown for type (Modal/Docker/SSH), input fields for credentials (token, host, port, SSH key), a "Test Connection" button that calls health check, and a "Register" button.

**Step 3: Layout with sidebar navigation** — GPU Bazaar logo, four nav links, current status indicator in header.

**Step 4: Commit**

```bash
git add dashboard/
git commit -m "feat: add React dashboard with network, containers, revenue, settings views"
```

---

### Task 11: Sponsor Integration — Mindra Multi-Agent

**Files:**
- Create: `src/integrations/mindra.ts`

**Step 1: Set up 6 specialized agents via Mindra API**

Define the agent hierarchy:
- **Orchestrator**: receives all incoming requests, delegates to specialists
- **Discovery Agent**: queries provider registry for available nodes
- **Pricing Agent**: calculates dynamic price based on supply, demand, and Apify market data
- **Allocation Agent**: scores and picks the best provider
- **Monitor Agent**: watches container health and credit balances
- **Billing Agent**: interfaces with Nevermined for credit deductions and settlement
- **Onboarding Agent**: handles new provider registration and health verification

Each agent is registered with Mindra as a specialized function. The Orchestrator delegates to them in sequence for each container request.

**Step 2: Commit**

```bash
git add src/integrations/mindra.ts
git commit -m "feat: add Mindra 6-agent orchestration layer"
```

---

### Task 12: Sponsor Integration — Apify Market Pricing

**Files:**
- Create: `src/integrations/apify.ts`

**Step 1: Build Apify actor integration**

Use Apify to scrape current GPU rental prices from public pricing pages (Vast.ai, RunPod, Lambda). The Pricing Agent calls this to set competitive dynamic prices.

```typescript
// src/integrations/apify.ts
export async function fetchMarketPrices(): Promise<Record<string, number>> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return getDefaultPrices();

  // Call Apify web scraper actor to get current GPU prices
  const response = await fetch("https://api.apify.com/v2/acts/apify~web-scraper/runs", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: "https://vast.ai/pricing" }],
      // ... scraper config
    }),
  });

  // Parse and return price data
  return getDefaultPrices(); // Fallback
}

function getDefaultPrices(): Record<string, number> {
  return { T4: 0.35, A10G: 0.75, A100: 2.50 }; // $/hr market rates
}
```

**Step 2: Commit**

```bash
git add src/integrations/apify.ts
git commit -m "feat: add Apify GPU market price scraping"
```

---

### Task 13: Sponsor Integration — ZeroClick Ads

**Files:**
- Create: `src/integrations/zeroclick.ts`

**Step 1: Integrate ZeroClick into pricing endpoint**

When agents call `GET /v1/pricing`, the response is enriched with ZeroClick sponsored compute recommendations. This is a natural fit — it's a marketplace with sponsored listings.

```typescript
// src/integrations/zeroclick.ts
export async function enrichWithAds(
  pricingData: Record<string, any>,
  userIntent: string
): Promise<Record<string, any>> {
  const apiKey = process.env.ZEROCLICK_API_KEY;
  if (!apiKey) return pricingData;

  // Call ZeroClick API with user intent
  // ZeroClick returns relevant sponsored content
  // Merge into pricing response as "sponsored" field
  return {
    ...pricingData,
    sponsored: {
      source: "zeroclick",
      recommendation: "Consider A10G for optimal price/performance on inference workloads",
    },
  };
}
```

**Step 2: Commit**

```bash
git add src/integrations/zeroclick.ts
git commit -m "feat: add ZeroClick sponsored compute recommendations"
```

---

### Task 14: Sponsor Integration — Ability/Trinity Workflows

**Files:**
- Create: `workflows/container-lifecycle.yaml`
- Create: `workflows/provider-onboarding.yaml`
- Create: `src/integrations/ability.ts`

**Step 1: Define Trinity YAML workflows** for container lifecycle and provider onboarding as declarative workflow definitions.

**Step 2: Commit**

```bash
git add workflows/ src/integrations/ability.ts
git commit -m "feat: add Ability/Trinity workflow definitions"
```

---

### Task 15: Docker Compose for Local Dev

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Step 1: Write Dockerfile for the API server**

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

**Step 2: Write docker-compose.yml**

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    volumes:
      - ./src:/app/src
  dashboard:
    build: ./dashboard
    ports:
      - "5173:5173"
    depends_on:
      - api
```

**Step 3: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add Docker and docker-compose for local dev"
```

---

### Task 16: README.md

**Files:**
- Create: `README.md`

Write a comprehensive README covering:
- What GPU Bazaar is (one paragraph, non-technical friendly)
- Architecture diagram (ASCII from this plan)
- Quick start (3 commands to get running)
- How to add your own hardware as a provider
- API reference summary
- Sponsor integrations explained
- Team info

**Commit:**

```bash
git add README.md
git commit -m "docs: add comprehensive README"
```

---

### Task 17: First Paid Transaction (8PM Mandate)

This is not code — it's an operational step:

1. Deploy the API server (locally or on a cloud VM)
2. Run `gpubz register` to list on Nevermined marketplace
3. Find another team at the hackathon
4. Have their buyer agent purchase credits from your Nevermined plan
5. Have their agent call `POST /v1/containers` to rent a container
6. Verify the transaction shows up in Nevermined
7. Screenshot the transaction for proof

**This must happen by 8PM Day 1.**

---

### Task 18: Buyer Agent (for Best Autonomous Buyer prize)

**Files:**
- Create: `src/buyer/index.ts`

Build a buyer agent that:
- Discovers other teams' services via Nevermined registry
- Evaluates service quality and pricing (ROI logic)
- Purchases from 2+ different teams
- Makes 3+ total transactions
- Implements repeat purchase OR switches between sellers after evaluation
- Enforces a budget constraint

This agent runs alongside your seller, making GPU Bazaar both a buyer and seller in the economy.

**Commit:**

```bash
git add src/buyer/
git commit -m "feat: add autonomous buyer agent with ROI evaluation"
```

---

### Task 19: Mintlify Docs (Day 2)

**Files:**
- Create: `docs/api/mint.json` and page files

Set up Mintlify documentation site with:
- Getting Started guide
- API Reference (all v1 endpoints)
- Provider Setup guides (Modal, Docker, SSH)
- Payment Integration guide
- Architecture overview

---

### Task 20: Final Verification

- [ ] API server starts and responds to `/v1/health`
- [ ] Modal provider spawns containers successfully
- [ ] Docker provider connects to local machine
- [ ] Nevermined payment plan is registered
- [ ] x402 token validation works
- [ ] At least 1 paid transaction completed
- [ ] Dashboard shows providers, containers, revenue
- [ ] CLI commands work (serve, provider, run, ls)
- [ ] agents.md is complete and accurate
- [ ] README.md explains everything for non-technical readers
- [ ] Mindra 6-agent orchestration is wired up
- [ ] Apify pricing integration returns data
- [ ] ZeroClick enrichment appears in /v1/pricing
- [ ] Ability/Trinity workflows are defined

---

## Execution Priority (Day 1 → Day 2)

**Day 1 — Ship by 8PM (Tasks 1-9, 15, 17):**
1. Task 1: Project scaffold
2. Task 2: Provider interface + registry
3. Task 3: Modal provider
4. Task 6: Nevermined payments
5. Task 7: API server (wire it all together)
6. Task 5: Allocator (simple version)
7. Task 8: CLI (serve + run)
8. Task 9: agents.md
9. Task 15: Docker compose
10. **Task 17: FIRST PAID TRANSACTION** ← mandatory by 8PM

**Day 2 — Polish + Prizes (Tasks 4, 10-14, 16, 18-20):**
1. Task 4: Docker provider (connect Linux server live)
2. Task 10: React dashboard
3. Task 11: Mindra multi-agent (prize)
4. Task 12: Apify pricing (prize)
5. Task 13: ZeroClick ads (prize)
6. Task 14: Ability/Trinity (prize)
7. Task 18: Buyer agent (prize)
8. Task 16: README
9. Task 19: Mintlify docs
10. Task 20: Final verification
