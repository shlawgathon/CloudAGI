"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/api";
import type { CreateOrderResponse } from "@/lib/types";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const jobTypes = [
  { value: "inference", label: "Inference" },
  { value: "eval", label: "Eval" },
  { value: "batch", label: "Batch" },
  { value: "custom", label: "Custom" }
];

const gpuHourOptions = [
  { value: "1", label: "1 hour (60 credits)" },
  { value: "2", label: "2 hours (120 credits)" },
  { value: "4", label: "4 hours (240 credits)" },
  { value: "8", label: "8 hours (480 credits)" }
];

const demoDefaults = {
  customerName: "research-agent-7b",
  contact: "agent-7b@autonomy.ai",
  jobType: "batch",
  repoUrl: "https://github.com/cloudagi/worker",
  gpuHours: "1",
  command: 'python -m agent.expand_compute --gpu A10G --task "fine-tune adapter"',
  inputNotes:
    "Agent hit compute ceiling after epoch 3/5 of LoRA fine-tune. Discovered CloudAGI on the Nevermined marketplace. Requesting 1h GPU time (60 credits) to complete remaining epochs on A10G.",
  expectedOutput:
    "Fine-tuned adapter weights (.safetensors), training logs, eval metrics, and proof of completed compute — all billed per-minute against the purchased credits."
};

function splitCommand(value: string): string[] {
  return (
    value
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((part) => part.replace(/^"|"$/g, ""))
      .filter(Boolean) ?? []
  );
}

export function OrderForm({
  reviewHref = "/#loop",
  compact = false,
  demo = false
}: {
  reviewHref?: string;
  compact?: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrderResponse | null>(null);

  const d = demo ? demoDefaults : undefined;

  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,15,27,0.96),rgba(4,8,16,0.98))] p-5 shadow-[var(--shadow)] backdrop-blur md:p-6">
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
        <div
          className={`mb-6 ${compact ? "flex flex-col gap-4" : "flex items-end justify-between gap-4"}`}
        >
        <div>
          <div className="mb-2 flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-soft)]">
              Agent Compute Order
            </p>
            {demo ? (
              <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                Demo
              </span>
            ) : null}
          </div>
          <h2 className="font-[var(--font-display)] text-2xl text-white md:text-[2rem]">
            Let agents find and buy their own compute.
          </h2>
          {compact ? (
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Agents discover CloudAGI on Nevermined, purchase GPU hours, and Trinity runs the job.
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              An AI agent discovers it needs more compute, finds CloudAGI on the Nevermined marketplace,
              purchases GPU hours as credits, and Trinity orchestrates the work across Modal sandboxes.
            </p>
          )}
        </div>
        {compact ? null : (
          <div className="rounded-full border border-[var(--border)] bg-white/[0.04] px-4 py-2 text-sm text-[var(--muted)]">
            Agent-ready · paid execution · proof attached
          </div>
        )}
        </div>

      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);

          const form = event.currentTarget;
          const formData = new FormData(form);
          const command = splitCommand(String(formData.get("command") || ""));

          if (command.length === 0) {
            setError("Command is required.");
            return;
          }

          const payload = {
            customerName: String(formData.get("customerName") || ""),
            contact: String(formData.get("contact") || ""),
            jobType: String(formData.get("jobType") || "custom"),
            repoUrl: String(formData.get("repoUrl") || "") || undefined,
            command,
            inputNotes: String(formData.get("inputNotes") || ""),
            expectedOutput: String(formData.get("expectedOutput") || ""),
            gpuHours: Number(formData.get("gpuHours") || "1")
          };

          startTransition(async () => {
            try {
              const response = await createOrder(payload);
              setResult(response);

              // In demo mode, auto-start the order (skip payment)
              if (demo) {
                try {
                  await fetch(`/api/v1/orders/${response.order.id}/start`, {
                    method: "POST",
                    headers: { "x-demo": "true" }
                  });
                } catch {
                  // non-blocking
                }
              }

              router.push(`/dashboard/${response.order.id}`);
            } catch (submissionError) {
              setError(
                submissionError instanceof Error
                  ? submissionError.message
                  : "Unable to create order."
              );
            }
          });
        }}
      >
        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Operator</span>
          <input
            name="customerName"
            required
            defaultValue={d?.customerName}
            placeholder="Who is launching the run?"
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none ring-0 transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Contact</span>
          <input
            name="contact"
            required
            defaultValue={d?.contact}
            placeholder="email, Telegram, X handle"
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Workload Type</span>
          <select
            name="jobType"
            defaultValue={d?.jobType || "inference"}
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg-soft)]"
          >
            {jobTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Repo URL</span>
          <input
            name="repoUrl"
            defaultValue={d?.repoUrl}
            placeholder="https://github.com/your/repo"
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">GPU Hours</span>
          <select
            name="gpuHours"
            defaultValue={demo ? "1" : d?.gpuHours || "1"}
            disabled={demo}
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demo ? (
              <option value="1">1 hour (60 credits) — demo</option>
            ) : (
              gpuHourOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Command</span>
          <input
            name="command"
            required
            defaultValue={d?.command}
            placeholder='python -m agent.expand_compute --gpu A10G --task "fine-tune adapter"'
            className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Input Notes</span>
          <textarea
            name="inputNotes"
            required
            rows={4}
            defaultValue={d?.inputNotes}
            placeholder="What is the agent trying to achieve, what budget wall did it hit, and what extra compute should this order unlock?"
            className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Expected Output</span>
          <textarea
            name="expectedOutput"
            required
            rows={3}
            defaultValue={d?.expectedOutput}
            placeholder="Artifacts, logs, model output, eval results, or any proof that the added compute actually completed useful work."
            className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.08]"
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(18,30,47,0.98),rgba(10,17,29,0.98))] px-5 py-3 text-sm font-medium text-white transition hover:bg-[linear-gradient(180deg,rgba(24,38,58,0.98),rgba(12,21,35,0.98))] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating order..." : demo ? "Launch demo order" : "Create expansion order"}
          </button>
          <a
            href={reviewHref}
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--muted)] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            Review the flow
          </a>
        </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {result && !demo ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,27,0.92),rgba(4,8,16,0.98))] p-5">
            <GlowingEffect
              spread={38}
              glow
              disabled={false}
              proximity={72}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative z-10">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-soft)]">
                Order Created
              </p>
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div>
                  <span className="text-white">Order ID</span>
                  <div className="mt-1 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-xs text-white">
                    {result.order.id}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-white">Status</span>
                    <div className="mt-1">{result.order.status}</div>
                  </div>
                  <div>
                    <span className="text-white">Price</span>
                    <div className="mt-1">{result.order.priceLabel}</div>
                  </div>
                </div>
                <a
                  href={`/dashboard/${result.order.id}`}
                  className="inline-flex rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(18,30,47,0.98),rgba(10,17,29,0.98))] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[linear-gradient(180deg,rgba(24,38,58,0.98),rgba(12,21,35,0.98))]"
                >
                  Open dashboard
                </a>
              </div>
            </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,27,0.92),rgba(4,8,16,0.98))] p-5">
            <GlowingEffect
              spread={38}
              glow
              disabled={false}
              proximity={72}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative z-10">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-soft)]">
                Payment
              </p>
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div>{result.payment.instructions}</div>
                {"agentId" in result.payment ? (
                  <>
                    <div>
                      <span className="text-white">Rail</span>
                      <div className="mt-1 capitalize text-white/[0.85]">
                        {result.payment.paymentRail}
                      </div>
                    </div>
                    <div>
                      <span className="text-white">Agent ID</span>
                      <div className="mt-1 break-all font-mono text-xs text-white/[0.85]">
                        {result.payment.agentId}
                      </div>
                    </div>
                    <div>
                      <span className="text-white">Plan ID</span>
                      <div className="mt-1 break-all font-mono text-xs text-white/[0.85]">
                        {result.payment.planId}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
