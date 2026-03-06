import { Braces, FileJson, Link2 } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const requestExample = `{
  "agentName": "capacity-broker",
  "agentId": "broker-01",
  "jobType": "batch",
  "repoUrl": "https://github.com/cloudagi/worker",
  "command": ["python", "-m", "agent.expand_compute", "--gpu", "A10G"],
  "objective": "Unlock another GPU lane to finish the run before the deadline.",
  "expectedOutput": "Logs, artifacts, and a status page for the expansion order."
}`;

const responseExample = `{
  "order": {
    "id": "9fb7f8a1-...",
    "status": "awaiting_payment"
  },
  "payment": {
    "type": "nevermined-x402",
    "instructions": "Order the plan and call the start endpoint with PAYMENT-SIGNATURE."
  },
  "links": {
    "order": "/v1/orders/{id}",
    "start": "/v1/orders/{id}/start",
    "logs": "/v1/orders/{id}/logs",
    "artifacts": "/v1/orders/{id}/artifacts"
  }
}`;

export function AgentApiDocs() {
  return (
    <section className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)] md:p-6">
      <GlowingEffect
        blur={2}
        spread={46}
        glow
        disabled={false}
        proximity={90}
        inactiveZone={0.01}
        borderWidth={4}
      />
      <div className="relative z-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">Agent API</p>
          <h1 className="mt-3 max-w-[18ch] font-[var(--font-display)] text-[2.1rem] leading-[1.02] text-white md:text-[3rem]">
            Create compute-expansion orders programmatically.
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-[var(--muted)]">
            One machine endpoint to create the order, then follow the returned links for payment,
            start, logs, and artifacts.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <Braces className="h-5 w-5 text-[var(--accent)]" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem_17rem]">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-[#dffaf4]">
          POST /api/v1/agent/orders
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Contract</p>
          <p className="mt-2 text-sm text-white">One POST creates the order.</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Output</p>
          <p className="mt-2 text-sm text-white">Instructions plus next-step links.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="relative min-w-0 overflow-hidden rounded-[1.3rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,27,0.92),rgba(4,8,16,0.98))] p-5">
          <GlowingEffect
            spread={38}
            glow
            disabled={false}
            proximity={72}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-sm text-white">
              <FileJson className="h-4 w-4 text-[var(--accent-soft)]" />
              Example request
            </div>
            <pre className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/[0.32] p-4 text-xs leading-6 text-[#dffaf4]">
              {requestExample}
            </pre>
          </div>
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[1.3rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,27,0.92),rgba(4,8,16,0.98))] p-5">
          <GlowingEffect
            spread={38}
            glow
            disabled={false}
            proximity={72}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-sm text-white">
              <Link2 className="h-4 w-4 text-[var(--accent-soft)]" />
              Example response
            </div>
            <pre className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/[0.32] p-4 text-xs leading-6 text-[#dffaf4]">
              {responseExample}
            </pre>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
