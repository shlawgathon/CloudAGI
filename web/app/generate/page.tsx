import { ArrowLeft } from "lucide-react";
import { AgentApiTeaser } from "@/components/generate/agent-api-teaser";
import { GenerateHero } from "@/components/generate/generate-hero";
import { GenerateStatusCard } from "@/components/generate/generate-status-card";
import { OrderForm } from "@/components/order-form";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function GeneratePage() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(circle_at_top,rgba(101,255,225,0.14),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(255,178,115,0.14),transparent_24%)]" />

      <div className="mx-auto w-full max-w-[92rem] px-4 pb-20 pt-5 sm:px-6 lg:px-10">
        <header className="mb-5 flex flex-col gap-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <div className="font-[var(--font-display)] text-xl text-white">
                Generate Expansion Order
              </div>
              <div className="text-sm text-[var(--muted)]">
                Clean UI for humans, dedicated docs for agents
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <a
              href="/generate/api"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08] hover:text-white"
            >
              API docs
            </a>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
          <GenerateHero />
          <AgentApiTeaser />
        </section>

        <section className="mt-5 shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <OrderForm reviewHref="/#loop" compact />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,18,31,0.92),rgba(5,9,17,0.96))] p-5">
            <GlowingEffect
              spread={40}
              glow
              disabled={false}
              proximity={80}
              inactiveZone={0.01}
              borderWidth={4}
            />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                Operator Flow
              </p>
              <h2 className="mt-3 text-xl font-semibold text-white">
                Keep the landing page clean. Put execution details here.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                The homepage sells the idea. This surface handles actual order creation and keeps the
                programmatic path isolated in the API docs.
              </p>
            </div>
          </div>
          <GenerateStatusCard />
        </section>
      </div>
    </main>
  );
}
