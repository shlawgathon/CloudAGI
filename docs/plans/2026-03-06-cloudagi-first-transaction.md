# CloudAGI Implementation Plan

## Objective

Close the first paid CloudAGI transaction within 8 hours.

CloudAGI is a direct GPU execution service. A customer pays in USDC for a specific job through Nevermined, CloudAGI runs that job on Modal, and returns the result. This is a single-operator business, not a marketplace.

## Hard Constraints

- Name: `CloudAGI`
- Compute backend: `Modal` only
- Payment rail: `USDC`
- Payment infrastructure: `Nevermined`
- No marketplace mechanics
- No external provider onboarding
- No dependency on other teams to make the first sale happen

## Positioning

CloudAGI sells “GPU job completion as a service” for customers who need results today and do not want to set up infra.

The first version should not sell “infinite compute.” It should sell one narrow promise:

> Pay in USDC through Nevermined, send the workload, get a completed GPU run plus logs and outputs.

## Offer Design

Pick one offer and ship it. Do not launch with multiple plans.

Recommended launch offer:

- Name: `CloudAGI Fast Run`
- Price: `25 USDC`
- Scope: one GPU job, up to 30 minutes runtime, one approved base image, async delivery
- Target jobs: inference, evals, batch transforms, scripted model runs
- Delivery: job status page plus downloadable output artifact

If the workload is larger, handle it manually after the first transaction. Do not build tiering before payment happens.

## Product Scope

### Included in MVP

- Landing page with one clear offer
- Order intake form
- Nevermined plan metadata and payment gating
- x402-protected paid execution
- Modal job execution
- Job status tracking
- Output delivery
- Operator dashboard or simple admin view for manual oversight

### Explicitly Excluded

- Provider marketplace
- Dynamic provider allocation
- Docker and SSH backends
- Sponsored listings, ads, or buyer agents
- Complex workflow orchestration

## Simplified Architecture

```text
Customer
  │
  │ creates order
  ▼
CloudAGI Web/API
  │
  ├─ creates order
  ├─ returns Nevermined plan metadata
  │
  │ customer buys plan in USDC + gets x402 token
  ▼
CloudAGI Paid Start Endpoint
  │
  ├─ verifies x402 token with Nevermined
  ├─ settles one credit
  └─ launches Modal sandbox/job
          │
          ▼
        Modal
          │
          ├─ runs command
          ├─ captures logs
          └─ writes artifacts
```

## Transaction Flow

### Current paid path

1. Customer lands on CloudAGI and sees one offer.
2. Customer fills out a short form:
   - name or handle
   - contact
   - job type
   - repo or script
   - expected output
3. CloudAGI creates an order in `awaiting_payment`.
4. CloudAGI returns Nevermined `agentId` and `planId`.
5. Customer orders the plan in Nevermined using USDC.
6. Customer generates an x402 access token.
7. Customer calls `POST /v1/orders/:id/start` with `payment-signature`.
8. CloudAGI verifies and settles the payment with Nevermined.
9. CloudAGI launches the job on Modal.
10. Customer gets a job page with:
    - order ID
    - job status
    - logs
    - output artifact metadata

## Technical Design

### Core Entities

```ts
type OrderStatus =
  | "awaiting_payment"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

interface Order {
  id: string;
  customerName: string;
  contact: string;
  jobType: "inference" | "eval" | "batch" | "custom";
  repoUrl?: string;
  command: string[];
  inputNotes: string;
  expectedOutput: string;
  priceUsdc: string;
  status: OrderStatus;
  modalSandboxId?: string;
  nevermined?: {
    agentId: string;
    planId: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### API Surface

```text
POST   /v1/orders                     Create order and return USDC payment instructions
GET    /v1/orders/:id                 Get order and job status
POST   /v1/orders/:id/start           Paid start endpoint (Nevermined x402)
GET    /v1/orders/:id/logs            Read job logs
GET    /v1/orders/:id/artifacts       List output artifacts
GET    /v1/health                     Health
```

### Modal Integration

Use Modal as the only execution backend. The current JS SDK shape to anchor on is:

- `new ModalClient()`
- `await modal.apps.fromName("cloudagi", { environment, createIfMissing: true })`
- `await modal.images.fromRegistry("python:3.13")`
- `await modal.sandboxes.create(app, image, { timeoutMs, gpu })`
- `await sandbox.exec(command, { timeoutMs })`

This was checked against Context7’s current Modal JavaScript SDK docs before writing this plan.

### Nevermined Integration

Use Nevermined as the payment and access-control layer:

- register a USDC-priced plan with `payments.agents.registerAgentAndPlan(...)`
- use `payments.plans.getERC20PriceConfig(...)` for USDC pricing
- use `buildPaymentRequired(...)` for `402 Payment Required` responses
- use `payments.facilitator.verifyPermissions(...)` before job launch
- use `payments.facilitator.settlePermissions(...)` before running the job

This flow was checked against Context7’s current Nevermined docs before implementation.

## Build Sequence

### Phase 1: First Transaction Path

1. Create the CloudAGI offer page and order form.
2. Implement `POST /v1/orders`.
3. Return Nevermined `agentId` and `planId`.
4. Implement `POST /v1/orders/:id/start` as an x402-protected endpoint.
5. Implement Modal job launch for one base image and one command format.
6. Implement status polling and logs.
7. Add artifact storage.
8. Add a Nevermined registration script for the CloudAGI offer.

### Phase 2: Remove Operator Friction

1. Auto-detect payment by tx hash.
2. Add reusable job templates.
3. Add customer notifications.
4. Harden validation and sandbox limits.

Only start Phase 2 after the first real payment happens.

## Repo Layout

```text
cloudagi/
├── README.md
├── docs/
│   └── plans/
│       └── 2026-03-06-cloudagi-first-transaction.md
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── jobs/
│   │   ├── modal.ts
│   │   └── runner.ts
│   ├── orders/
│   │   ├── store.ts
│   │   └── types.ts
│   └── payments/
│       └── nevermined.ts
├── web/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── next.config.ts
└── src/scripts/
    └── register-nevermined.ts
```

## 8-Hour Execution Plan

### Hour 0-1

- Finalize one paid offer
- Configure Nevermined seller credentials
- Write landing copy that makes the promise concrete

### Hour 1-3

- Build order creation endpoint
- Build status page
- Build the Nevermined-gated start flow

### Hour 3-5

- Build Modal job runner
- Test one known-good command end to end
- Capture logs and output files

### Hour 5-6

- Register the CloudAGI plan on Nevermined
- Add clear failure states
- Dry-run the full transaction flow yourself

### Hour 6-8

- Start outbound immediately
- Offer the fixed CloudAGI Fast Run to warm leads
- Close one transaction
- Capture proof: Nevermined transaction, order page, Modal run, delivered output

## Sales Script

Use this exact shape in outbound:

> CloudAGI will run your AI GPU job for you today on Modal. Fixed price: 25 USDC through Nevermined. Send the script, repo, or task spec, and I’ll deliver the result, logs, and artifacts without you setting up any infra.

Do not pitch a platform. Pitch completed work.

## Success Criteria

- One public CloudAGI offer exists
- A customer can create an order without talking to you first
- A customer can pay in USDC through Nevermined
- A customer can start a paid job with an x402 token
- Modal completes a real workload
- Customer receives logs and output
- One real USDC transaction is completed within 8 hours

## Kill List

If time gets tight, delete these immediately:

- dashboard polish
- multiple GPU types
- pricing engine
- auth
- credits system
- provider abstraction
- buyer flows
- sponsor integrations
- anything involving “marketplace”

## Immediate Next Build

If execution starts now, the first code to write should be:

1. `POST /v1/orders`
2. `GET /v1/orders/:id`
3. `POST /v1/orders/:id/start`
4. Modal runner for a single command template
5. A minimal landing page with the order form
