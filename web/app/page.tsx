import type { ComponentType } from "react";
import Image from "next/image";
import { Bot, Braces, Cpu, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { StatusSearch } from "@/components/status-search";
import { AnimatedHero } from "@/components/ui/animated-hero";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { ShaderAnimation } from "@/components/ui/shader-animation";

const navItems = [
  { href: "/generate", label: "Generate" },
  { href: "/generate#agent-endpoint", label: "API" },
  { href: "#status", label: "Status" }
];

const signalCards = [
  {
    title: "Pay to expand",
    body: "Agents unlock another run when they hit a limit.",
    Icon: Receipt
  },
  {
    title: "Keep orchestration alive",
    body: "Trinity continues the workflow while Modal takes the next GPU step.",
    Icon: Cpu
  },
  {
    title: "Verify the path",
    body: "Payment stays explicit before execution starts.",
    Icon: ShieldCheck
  }
];

const quickProof = [
  {
    label: "Commercial rail",
    value: "Nevermined",
    Icon: Receipt
  },
  {
    label: "Orchestration",
    value: "Trinity",
    Icon: Bot
  },
  {
    label: "Execution",
    value: "Modal GPU",
    Icon: Cpu
  },
  {
    label: "Machine entrypoint",
    value: "POST /api/v1/agent/orders",
    Icon: Braces
  }
];

function SignalCard({
  title,
  body,
  Icon
}: {
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.3rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,14,26,0.94),rgba(5,8,16,0.98))] p-4">
      <GlowingEffect
        blur={2}
        spread={44}
        glow
        disabled={false}
        proximity={88}
        inactiveZone={0.01}
        borderWidth={4}
      />
      <div className="relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05]">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(101,255,225,0.14),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(255,178,115,0.14),transparent_24%)]" />

      <div className="mx-auto w-full max-w-[92rem] px-4 pb-14 pt-5 sm:px-6 lg:px-10">
        <header className="mb-5 flex flex-col gap-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-[3rem] w-[3rem] shrink-0 overflow-hidden rounded-full">
              <Image src="/icon.png" alt="CloudAGI" width={80} height={80} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-[var(--font-display)] text-lg text-white">CloudAGI</div>
              <div className="text-sm text-[var(--muted)]">
                Agent-native compute commerce
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(7,13,23,0.92),rgba(5,8,18,0.84))] shadow-[0_35px_120px_rgba(0,0,0,0.42)]">
          <div className="absolute inset-0 opacity-70">
            <ShaderAnimation />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(101,255,225,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,178,115,0.16),transparent_28%),linear-gradient(180deg,rgba(3,7,15,0.08),rgba(3,7,15,0.82))]" />

          <div className="relative z-10 grid gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-8 lg:py-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-[var(--accent-soft)] backdrop-blur">
                <Sparkles className="h-4 w-4" />
                <span>AI agents should be able to buy more compute</span>
              </div>

              <AnimatedHero
                titlePrefix="Let AI agents buy"
                titleSuffix="without waiting for ops."
                rotatingWords={["runtime", "compute", "GPU bursts", "new lanes"]}
                description="CloudAGI turns payment into execution."
                primaryCtaHref="/generate"
                primaryCtaLabel="Generate order"
                secondaryCtaHref="/generate#agent-endpoint"
                secondaryCtaLabel="Use API"
              />

              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                  Nevermined
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                  Trinity
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                  Modal
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {signalCards.map((card) => (
                <SignalCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,18,31,0.92),rgba(5,9,17,0.96))] p-5">
            <GlowingEffect
              blur={2}
              spread={44}
              glow
              disabled={false}
              proximity={88}
              inactiveZone={0.01}
              borderWidth={4}
            />
            <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
              Fast Proof
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickProof.map((item) => (
                <div
                  key={item.label}
                  className="relative overflow-hidden rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.92),rgba(5,8,16,0.98))] p-4"
                >
                  <GlowingEffect
                    spread={38}
                    glow
                    disabled={false}
                    proximity={70}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <div className="relative z-10">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                      <item.Icon className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <div
            id="status"
            className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,18,31,0.92),rgba(5,9,17,0.96))] p-5"
          >
            <GlowingEffect
              blur={2}
              spread={44}
              glow
              disabled={false}
              proximity={88}
              inactiveZone={0.01}
              borderWidth={4}
            />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                Status
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-2xl text-white md:text-3xl">
                Jump into the actual run.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Inspect an existing order, or create a new one on the dedicated generator page.
              </p>
              <div className="mt-5">
                <StatusSearch />
              </div>
              <a
                href="/generate"
                className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2.5 text-sm text-[var(--muted)] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
              >
                Open generate page
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
