import { Bot, Cpu, Wallet } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const quickStats = [
  { label: "Payment", value: "Nevermined", Icon: Wallet },
  { label: "Routing", value: "Trinity", Icon: Bot },
  { label: "Compute", value: "Modal GPU", Icon: Cpu }
];

export function GenerateHero() {
  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,31,0.92),rgba(5,9,17,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)] md:p-6">
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
          Generate Order
        </p>
        <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-[2rem] leading-[1.05] text-white md:text-[3.2rem]">
          Launch a compute-expansion order without turning the homepage into a control panel.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Use the form for manual launches. Use the agent API when another system should create the
          same order programmatically.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {quickStats.map((item) => (
            <div
              key={item.label}
              className="relative min-w-0 overflow-hidden rounded-[1.1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.92),rgba(5,8,16,0.98))] p-4"
            >
              <GlowingEffect
                spread={36}
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
                <p className="mt-3 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-base font-semibold text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
