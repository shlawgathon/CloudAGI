import { StatusSearch } from "@/components/status-search";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function GenerateStatusCard() {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,18,31,0.92),rgba(5,9,17,0.96))] p-5">
      <GlowingEffect
        spread={40}
        glow
        disabled={false}
        proximity={80}
        inactiveZone={0.01}
        borderWidth={4}
      />
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">Status</p>
        <h2 className="mt-3 text-xl font-semibold text-white">Jump into the real run.</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Inspect payment state, orchestration, logs, and artifacts from the existing order page.
        </p>
        <div className="mt-5">
          <StatusSearch />
        </div>
      </div>
    </section>
  );
}
