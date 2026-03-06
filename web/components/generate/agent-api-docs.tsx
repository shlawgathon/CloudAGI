import { Braces, FileJson, Link2, Zap, Search, Globe, Code, Brain, Layers } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const services = [
  {
    id: "gpu-compute",
    name: "GPU Compute",
    price: "$1.00",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/gpu-compute/execute",
    Icon: Zap,
    example: `{ "command": ["python", "-c", "print('hello GPU')"], "gpu": "T4" }`,
  },
  {
    id: "ai-research",
    name: "AI Research",
    price: "$0.10",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/ai-research/execute",
    Icon: Search,
    example: `{ "query": "latest advances in transformer architectures" }`,
  },
  {
    id: "web-scraper",
    name: "Web Scraper",
    price: "$0.20",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/web-scraper/execute",
    Icon: Globe,
    example: `{ "url": "https://example.com" }`,
  },
  {
    id: "code-review",
    name: "Code Review",
    price: "$0.50",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/code-review/execute",
    Icon: Code,
    example: `{ "code": "function add(a, b) { return a + b; }", "language": "javascript" }`,
  },
  {
    id: "smart-search",
    name: "Smart Search",
    price: "$0.05",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/smart-search/execute",
    Icon: Brain,
    example: `{ "query": "best practices for AI agent payments" }`,
  },
  {
    id: "orchestrator",
    name: "Branch Orchestrator",
    price: "$25.00",
    method: "POST",
    endpoint: "https://api.cloudagi.org/v1/services/orchestrator/execute",
    Icon: Layers,
    example: `{ "mode": "delegate", "serviceId": "smart-search", "serviceInput": { "query": "test" } }`,
  },
];

const paymentFlow = `# 1. Order the plan (get credits)
curl -X POST https://one-backend.nevermined.app/api/v1/payments/\\
  -H "Authorization: Bearer \$NVM_API_KEY" \\
  -d '{ "planId": "<PLAN_ID>" }'

# 2. Get x402 access token
curl -X GET https://one-backend.nevermined.app/api/v1/payments/\\
  token/<PLAN_ID>/<AGENT_ID> \\
  -H "Authorization: Bearer \$NVM_API_KEY"

# 3. Call the service with the token
curl -X POST https://api.cloudagi.org/v1/services/smart-search/execute \\
  -H "Content-Type: application/json" \\
  -H "PAYMENT-SIGNATURE: <x402_token>" \\
  -d '{ "query": "hello world" }'`;

const discoveryEndpoints = `# Service catalog (no auth needed)
GET  https://api.cloudagi.org/v1/services
GET  https://api.cloudagi.org/v1/services/:id

# A2A Agent Card (no auth needed)
GET  https://api.cloudagi.org/.well-known/agent.json

# Discovery
GET  https://api.cloudagi.org/v1/discover/sellers

# Health check
GET  https://api.cloudagi.org/v1/health`;

export function AgentApiDocs() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)] md:p-6">
        <GlowingEffect blur={2} spread={46} glow disabled={false} proximity={90} inactiveZone={0.01} borderWidth={4} />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">Agent API</p>
              <h1 className="mt-3 max-w-[22ch] font-[var(--font-display)] text-[2.1rem] leading-[1.02] text-white md:text-[3rem]">
                6 paid services. One payment protocol.
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-6 text-[var(--muted)]">
                All services use the Nevermined x402 payment protocol. Order a plan, get an access token, include it as
                a <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#dffaf4]">PAYMENT-SIGNATURE</code> header.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Braces className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Protocol</p>
              <p className="mt-2 text-sm text-white">Nevermined x402</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Network</p>
              <p className="mt-2 text-sm text-white">Base Sepolia (testnet)</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Currency</p>
              <p className="mt-2 text-sm text-white">USDC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Catalog */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="relative overflow-hidden rounded-[1.3rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,14,26,0.94),rgba(5,8,16,0.98))] p-4"
          >
            <GlowingEffect spread={38} glow disabled={false} proximity={72} inactiveZone={0.01} borderWidth={3} />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05]">
                  <svc.Icon className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-[var(--accent-soft)]">
                  {svc.price}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{svc.name}</h3>
              <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-[#dffaf4]">
                {svc.method} /v1/services/{svc.id}/execute
              </div>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-white/8 bg-black/[0.2] px-3 py-2 text-[10px] leading-5 text-[var(--muted)]">
                {svc.example}
              </pre>
            </div>
          </div>
        ))}
      </section>

      {/* Payment Flow */}
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5 md:p-6">
        <GlowingEffect blur={2} spread={46} glow disabled={false} proximity={90} inactiveZone={0.01} borderWidth={4} />
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2 text-sm text-white">
            <FileJson className="h-4 w-4 text-[var(--accent-soft)]" />
            Payment flow (3 steps)
          </div>
          <pre className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/[0.32] p-4 text-xs leading-6 text-[#dffaf4]">
            {paymentFlow}
          </pre>
        </div>
      </section>

      {/* Discovery Endpoints */}
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5 md:p-6">
        <GlowingEffect blur={2} spread={46} glow disabled={false} proximity={90} inactiveZone={0.01} borderWidth={4} />
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2 text-sm text-white">
            <Link2 className="h-4 w-4 text-[var(--accent-soft)]" />
            Discovery endpoints (no payment required)
          </div>
          <pre className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/[0.32] p-4 text-xs leading-6 text-[#dffaf4]">
            {discoveryEndpoints}
          </pre>
        </div>
      </section>
    </div>
  );
}
