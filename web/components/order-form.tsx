"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/api";
import type { CreateOrderResponse } from "@/lib/types";

const jobTypes = [
  { value: "inference", label: "Inference" },
  { value: "eval", label: "Eval" },
  { value: "batch", label: "Batch" },
  { value: "custom", label: "Custom" }
];

function splitCommand(value: string): string[] {
  return (
    value
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((part) => part.replace(/^"|"$/g, ""))
      .filter(Boolean) ?? []
  );
}

export function OrderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrderResponse | null>(null);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
            Create Paid Order
          </p>
          <h2 className="font-[var(--font-display)] text-3xl text-white">
            Start with the job, not the infra.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
            Describe one concrete workload and expected result so CloudAGI can run and deliver it
            fast.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-white/5 px-4 py-2 text-xs tracking-[0.12em] text-[var(--muted)]">
          One offer · 25 USDC · One job credit
        </div>
      </div>

      <form
        className="grid gap-5 md:grid-cols-2"
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
            expectedOutput: String(formData.get("expectedOutput") || "")
          };

          startTransition(async () => {
            try {
              const response = await createOrder(payload);
              setResult(response);
              router.prefetch(`/orders/${response.order.id}`);
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
          <span className="text-sm text-[var(--muted)]">Name</span>
          <input
            name="customerName"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/14 px-4 py-3 text-white outline-none ring-0 transition focus:border-[var(--accent)]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Contact</span>
          <input
            name="contact"
            required
            placeholder="email, Telegram, X handle"
            className="w-full rounded-2xl border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Job Type</span>
          <select
            name="jobType"
            defaultValue="inference"
            className="w-full rounded-2xl border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
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
            placeholder="https://github.com/your/repo"
            className="w-full rounded-2xl border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Command</span>
          <input
            name="command"
            required
            placeholder='python -c "print(\"hello from CloudAGI\")"'
            className="w-full rounded-2xl border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
          <span className="block text-xs text-[var(--muted)]">
            Use one runnable command array target (entrypoint or script call).
          </span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Input Notes</span>
          <textarea
            name="inputNotes"
            required
            rows={5}
            className="w-full rounded-[1.5rem] border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-[var(--muted)]">Expected Output</span>
          <textarea
            name="expectedOutput"
            required
            rows={4}
            className="w-full rounded-[1.5rem] border border-white/10 bg-white/14 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="accent-gradient rounded-full px-6 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(240,125,73,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating order..." : "Create order"}
          </button>
          <a
            href="#payment-flow"
            className="rounded-full border border-white/10 px-6 py-3 text-sm text-[var(--muted)] transition hover:border-white/20 hover:text-white"
          >
            Review payment flow
          </a>
        </div>
      </form>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
              Order Created
            </p>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <div>
                <span className="text-white">Order ID</span>
                <div className="mt-1 break-all rounded-xl bg-white/14 px-3 py-2 font-mono text-xs text-white">
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
                  <div className="mt-1">{result.order.priceUsdc} USDC</div>
                </div>
              </div>
              <a
                href={`/orders/${result.order.id}`}
                className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#07111c] transition hover:bg-[var(--accent-2)]"
              >
                Open order status
              </a>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
              Payment
            </p>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <div>{result.payment.instructions}</div>
              {"agentId" in result.payment ? (
                <>
                  <div>
                    <span className="text-white">Agent ID</span>
                    <div className="mt-1 break-all font-mono text-xs text-white/85">
                      {result.payment.agentId}
                    </div>
                  </div>
                  <div>
                    <span className="text-white">Plan ID</span>
                    <div className="mt-1 break-all font-mono text-xs text-white/85">
                      {result.payment.planId}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
