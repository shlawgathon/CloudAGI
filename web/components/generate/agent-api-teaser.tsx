import { Braces, ExternalLink } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function AgentApiTeaser() {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5">
      <GlowingEffect
        spread={40}
        glow
        disabled={false}
        proximity={80}
        inactiveZone={0.01}
        borderWidth={4}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
              Agent API
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">One endpoint for machine callers.</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Braces className="h-4 w-4 text-[var(--accent)]" />
          </div>
        </div>

        <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-[#dffaf4]">
          POST /api/v1/agent/orders
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Full request and response examples live on a separate page, so this screen stays focused on
          order creation.
        </p>

        <a
          href="/generate/api"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent-soft)] transition hover:text-white"
        >
          Open API docs
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
