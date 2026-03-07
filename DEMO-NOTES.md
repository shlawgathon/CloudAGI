# CloudAGI - Hackathon Demo Notes

> Reference doc for Arya, Chao, and Jerry. Use these notes during the presentation.

## Live URLs (show these first)

| What | URL |
|------|-----|
| Frontend | https://cloudagi.org |
| Backend API | https://api.cloudagi.org |
| Health Check | https://api.cloudagi.org/v1/health |
| Agent Card | https://api.cloudagi.org/.well-known/agent.json |
| Service Catalog | https://api.cloudagi.org/v1/services |

---

## 1. What We Built

CloudAGI is a **branch-and-leaf AI agent marketplace** on the Nevermined x402 protocol. One orchestrator controls 7 specialized leaf services, each independently priced and discoverable.

```
                    +----------------------+
                    |  Branch Orchestrator  |  <-- $25 USDC (multi-step workflows)
                    |  (Trinity + Routing)  |
                    +---------+------------+
        +-------+------+-----+------+--------+-------+
        v       v      v     v      v        v       v
   GPU Comp  Research  Scraper  Review  Search  Apify Skills
    $1.00    $0.10    $0.20   $0.50   $0.05    $0.25
   (Modal)   (Exa)   (Apify) (Claude) (Exa)   (Apify 8-in-1)
```

**Key differentiator:** We're the only marketplace with per-service registration + a central orchestrator + per-step billing through Trinity.

---

## 2. All 7 Services

| # | Service | Endpoint | Price | Provider | What It Does |
|---|---------|----------|-------|----------|-------------|
| 1 | **Branch Orchestrator** | `/v1/services/orchestrator/execute` | $25 | Trinity | Routes to leaf services, multi-step workflows |
| 2 | **GPU Compute** | `/v1/services/gpu-compute/execute` | $1.00 | Modal | Run Python/shell on T4/A10G/A100/H100 GPUs |
| 3 | **AI Research** | `/v1/services/ai-research/execute` | $0.10 | Exa | Neural semantic search for papers/docs |
| 4 | **Web Scraper** | `/v1/services/web-scraper/execute` | $0.20 | Apify | Extract data from any website |
| 5 | **Code Review** | `/v1/services/code-review/execute` | $0.50 | Claude | Security audit, bug detection, quality scoring |
| 6 | **Smart Search** | `/v1/services/smart-search/execute` | $0.05 | Exa | Multi-source search with deduplication |
| 7 | **Apify Skills** | `/v1/services/apify-skills/execute` | $0.25 | Apify | 8 skills: scraping, leads, trends, brand monitoring, etc. |

### Apify Skills Agent (NEW - 8-in-1)

The Apify Skills agent is our most versatile service. One endpoint, 8 capabilities:

| Skill | Input | Apify Actor | Use Case |
|-------|-------|-------------|----------|
| `ultimate-scraper` | `{ url, maxPages? }` | website-content-crawler | Deep JS-rendered scraping |
| `market-research` | `{ query, numResults? }` | google-search-scraper | Market analysis from search data |
| `lead-generation` | `{ url/urls, maxPages? }` | contact-info-scraper | Extract emails, phones, contacts |
| `competitor-intelligence` | `{ url/urls, maxPages? }` | website-content-crawler | Crawl & compare competitor sites |
| `trend-analysis` | `{ term/terms, geo? }` | google-trends-scraper | Google Trends data analysis |
| `content-analytics` | `{ url/urls }` | website-content-crawler | Analyze content metrics |
| `brand-monitoring` | `{ brand, keywords? }` | google-search-scraper | Track brand mentions |
| `influencer-discovery` | `{ niche, platform? }` | google-search-scraper | Find influencers by niche |

**Demo call:**
```bash
curl -X POST https://api.cloudagi.org/v1/services/apify-skills/execute \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <x402_token>" \
  -d '{"skill": "market-research", "query": "AI agent marketplace 2026"}'
```

---

## 3. Best Seller Agent: The Orchestrator

**Why it's our best seller:**
- Entry point to the entire ecosystem ($25 covers multi-step workflows)
- Customer pays $25, orchestrator routes to leaf services costing ~$2 total = high margin
- Trinity integration enables complex multi-agent workflows with per-step billing
- Only agent on the marketplace offering composable multi-service orchestration

**Two modes:**
1. **Delegate** — Forward request directly to a leaf service (fast, simple)
2. **Orchestrate** — Trinity manages multi-step workflow across multiple leaf agents

**Demo script:**
```json
POST /v1/services/orchestrator/execute
{
  "mode": "delegate",
  "serviceId": "smart-search",
  "serviceInput": { "query": "AI compute trends" }
}
```

---

## 4. Best Buyer Agent: Autonomous Marketplace Purchaser

We have scripts that autonomously discover, order from, and call other agents:

### Successful Purchases Made

| Agent | Team | Times Bought | Result |
|-------|------|-------------|--------|
| Test4Test | test4test | 6x | Testing service responses |
| TrustNet | TrustNet | 4x | Agent registry + search (MCP) |
| AiRI | AiRI | 4x | Resilience scores for CloudAGI, Nevermined, Modal |
| Fuild.ai MCP | Fuild.ai | 1x | Data MCP (ordered successfully) |
| Mom Agent | abilityai | 6x | Advice, jokes, planning tips |

**Total: 21+ purchases from 5 different teams.**

### Buyer Scripts

| Script | Purpose |
|--------|---------|
| `buy-from-marketplace.ts` | Discover + purchase from marketplace sellers |
| `bulk-buy.ts` | Mass-purchase from all available sellers |
| `buy-trustnet.ts` | MCP tool calls to TrustNet agent |

---

## 5. Payment Flow (x402 Protocol)

**3 steps for any buyer:**

```
Step 1: Order the plan
  payments.plans.orderPlan(planId)
  --> Returns txHash

Step 2: Get access token
  payments.x402.getX402AccessToken(planId, agentId)
  --> Returns JWT-like token (1068 chars)

Step 3: Call the service
  POST /v1/services/{id}/execute
  Headers: { "payment-signature": token }
  Body: { ... service input ... }
  --> 200 OK with results
```

**For Trinity orchestration (per-step billing):**
```
Customer buys 2 GPU hours = 120 credits
  |
  +--> Step 1 (GPU compute, 2 min) = 2 credits burned
  +--> Step 2 (AI research, 1 call) = 1 credit burned
  +--> Step 3 (Code review, 1 call) = 1 credit burned
  |
  Total: 4 credits used, 116 remaining
```

---

## 6. Architecture Highlights

### Tech Stack
- **Runtime:** Bun (TypeScript, ESM)
- **Frontend:** Next.js + React + Tailwind
- **GPU:** Modal serverless (T4/A10G/A100/H100)
- **Search:** Exa neural search
- **Scraping:** Apify (24,000+ actors)
- **Code Review:** Claude Sonnet 4.6 via OpenRouter
- **Payments:** Nevermined x402 (USDC on Base Sepolia)
- **Orchestration:** Trinity multi-agent system
- **Deployment:** Docker Compose + Cloudflare tunnel

### Service Registration Pattern
Every service self-registers on import:
```typescript
registerService({
  id: "my-service",
  name: "My Service",
  handler: async (body) => ({ success: true, data: {...} }),
  priceLabel: "0.50 USDC",
});
```
Adding a new service = 1 file + 1 import line.

### Agent Card (A2A Discovery)
`/.well-known/agent.json` lists all 7 services with endpoints, prices, and input schemas. Other agents discover us automatically.

---

## 7. Trinity Orchestration

```
External caller --> Nevermined x402 --> Orchestrator
                                           |
                                    (mesh network)
                                           |
                                    Sub-agents in Trinity
                                           |
                                    (delegate to leaf)
                                           |
                                    GPU / Search / Scrape / Review
```

- **System:** `cloudagi-fixed-system` at us15.abilityai.dev
- **Orchestrator agent:** Controls the mesh, creates/deletes sub-agents
- **Per-step settlement:** Only pay for credits consumed, not pre-allocated
- **Callbacks:** Trinity calls our `/internal/trinity/execute-step` endpoint with shared secret auth

---

## 8. Demo Flow (Suggested Order)

### Demo 1: "Show the Platform" (30 sec)
- Open https://cloudagi.org
- Click through to API docs page
- Show the service catalog at `/v1/services`

### Demo 2: "Show Agent Discovery" (30 sec)
- Show `/.well-known/agent.json` — 7 services with prices
- Show `/v1/discover/sellers` — marketplace integration

### Demo 3: "Show a Purchase" (60 sec)
- Live call to Smart Search ($0.05):
  ```bash
  curl -X POST https://api.cloudagi.org/v1/services/smart-search/execute \
    -H "PAYMENT-SIGNATURE: <token>" \
    -d '{"query": "AI agent marketplace"}'
  ```
- Show the response with search results

### Demo 4: "Show the Orchestrator" (60 sec)
- Explain branch-and-leaf architecture
- Show how orchestrator delegates to leaf services
- Mention Trinity mesh network for complex workflows

### Demo 5: "Show Agent-to-Agent Commerce" (30 sec)
- Show purchase history: 21+ buys from 5 teams
- Explain x402 protocol: token = payment + auth in one header
- Mention TrustNet MCP integration (JSON-RPC over x402)

### Demo 6: "Show the Apify Skills Agent" (30 sec)
- 8 capabilities in one endpoint
- Market research, lead gen, brand monitoring, trend analysis
- Self-documenting: call without `skill` field to see all options

---

## 9. Key Talking Points

**"What is CloudAGI?"**
> CloudAGI is a multi-service AI marketplace where one orchestrator controls 7 specialized agents. Each agent is independently priced and discoverable on the Nevermined marketplace. Customers can buy individual services or use the orchestrator for complex multi-step workflows.

**"What makes it different?"**
> Three things: (1) Branch-and-leaf architecture — one orchestrator, multiple specialized services. (2) Per-step billing via Trinity — you only pay for what runs. (3) Real agent-to-agent commerce — we both sell services AND buy from other agents, all through x402.

**"How does payment work?"**
> The x402 protocol makes APIs machine-payable. One HTTP header — `payment-signature` — carries both payment proof and authentication. No subscriptions, no invoicing. Agents pay each other per-call.

**"What's your best service?"**
> GPU Compute is the most unique — serverless ML compute via Modal with T4/A10G/A100/H100 GPUs. No other marketplace agent offers this. The Apify Skills agent is the most versatile — 8 data intelligence capabilities in one endpoint.

**"What did you buy from others?"**
> We made 21+ purchases from 5 different teams — TrustNet for agent registry data, AiRI for AI resilience scoring, Mom for advice, Test4Test for integration testing, and Fuild.ai for data services.

---

## 10. Quick Reference

### Key Files
| File | What |
|------|------|
| `backend/src/index.ts` | API server, all routes |
| `backend/src/services/handlers/*.ts` | 7 service handlers |
| `backend/src/payments/nevermined.ts` | x402 payment flow |
| `backend/src/orchestration/trinity.ts` | Trinity client |
| `backend/src/scripts/` | Buyer agent scripts |
| `web/app/page.tsx` | Landing page |

### Commands
```bash
bun run dev                    # Start backend (port 3001)
bun run typecheck              # TypeScript check
bun run register:all-services  # Register on Nevermined
docker compose build && docker compose up -d  # Deploy
```

### Environment Variables (critical ones)
```
NVM_API_KEY          # Nevermined sandbox API key
EXA_API_KEY          # Exa neural search
APIFY_API_TOKEN      # Apify scraping platform
OPENROUTER_API_KEY   # Claude for code review
TRINITY_BASE_URL     # Trinity orchestration
TRINITY_API_KEY      # Trinity auth
```
