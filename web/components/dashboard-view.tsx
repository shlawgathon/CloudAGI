"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Loader2,
  XCircle
} from "lucide-react";
import {
  artifactDownloadUrl,
  fetchArtifactsClient,
  fetchLogsClient,
  fetchOrderClient
} from "@/lib/api";
import type { Artifact, Order, OrderAgentExecution } from "@/lib/types";

const POLL_MS = 3000;

function statusColor(status: string) {
  switch (status) {
    case "succeeded":
      return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    case "failed":
      return "text-red-300 border-red-400/25 bg-red-500/10";
    case "orchestrating":
    case "running":
    case "in_progress":
    case "triggered":
      return "text-amber-300 border-amber-400/25 bg-amber-400/10";
    default:
      return "text-white/60 border-white/10 bg-white/5";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "succeeded":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" />;
    case "running":
    case "orchestrating":
    case "in_progress":
    case "triggered":
      return <Loader2 className="h-4 w-4 animate-spin text-amber-300" />;
    default:
      return <Clock className="h-4 w-4 text-white/40" />;
  }
}

/* ─── Credit gauge ─── */
function CreditGauge({
  used,
  total
}: {
  used: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = total - used;

  return (
    <div className="rounded-[1.4rem] border border-white/[0.08] bg-black/20 p-5">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/50">
        <span>Credits</span>
        <span>
          {used} / {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-white/70">{remaining} remaining</span>
        <span className="text-white/40">{pct.toFixed(0)}% used</span>
      </div>
    </div>
  );
}

/* ─── Agent step card ─── */
function AgentCard({ agent }: { agent: OrderAgentExecution }) {
  const isLive = agent.status === "running" || agent.status === "requested";

  return (
    <div
      className={`rounded-[1.5rem] border p-5 transition-all duration-500 ${
        isLive
          ? "border-amber-400/20 bg-amber-400/[0.04] shadow-[0_0_30px_rgba(243,195,139,0.06)]"
          : agent.status === "succeeded"
            ? "border-emerald-400/15 bg-emerald-400/[0.03]"
            : agent.status === "failed"
              ? "border-red-400/15 bg-red-400/[0.03]"
              : "border-white/[0.08] bg-black/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
              isLive
                ? "border-amber-400/30 bg-amber-400/10"
                : "border-white/10 bg-white/[0.05]"
            }`}
          >
            {isLive ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
            ) : (
              <Cpu className="h-4 w-4 text-white/60" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium capitalize text-white">{agent.role}</div>
            <div className="mt-0.5 font-mono text-[0.65rem] text-white/40">{agent.stepId}</div>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${statusColor(agent.status)}`}
        >
          <StatusIcon status={agent.status} />
          {agent.status}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="GPU" value={agent.gpu} />
        <Stat label="Sandbox" value={agent.modalSandboxId || "Pending"} />
        {agent.durationMs !== undefined ? (
          <Stat label="Duration" value={`${(agent.durationMs / 1000).toFixed(1)}s`} />
        ) : null}
        {agent.creditsUsed !== undefined ? (
          <Stat label="Credits" value={`${agent.creditsUsed}`} />
        ) : null}
        <Stat
          label="Exit Code"
          value={agent.exitCode === undefined ? "—" : String(agent.exitCode)}
        />
        <Stat label="Callback" value={agent.callbackStatus || "pending"} />
      </div>

      <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
        <div className="mb-1 text-[0.6rem] uppercase tracking-[0.22em] text-white/40">Command</div>
        <div className="break-all font-mono text-xs text-white/80">
          {agent.command.join(" ")}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-1 truncate text-sm text-white">{value}</div>
    </div>
  );
}

/* ─── Main dashboard view ─── */
export function DashboardView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const stopped = useRef(false);

  const isTerminal = order?.status === "succeeded" || order?.status === "failed";

  const poll = useCallback(async () => {
    try {
      const [o, l, a] = await Promise.all([
        fetchOrderClient(orderId),
        fetchLogsClient(orderId),
        fetchArtifactsClient(orderId)
      ]);
      setOrder(o);
      setLogs(l);
      setArtifacts(a);
      setError(null);

      if (o.status === "succeeded" || o.status === "failed") {
        stopped.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Polling failed");
    }
  }, [orderId]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      if (!stopped.current) poll();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  if (error && !order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
          {error}
        </div>
        <Link href="/generate" className="mt-4 inline-block text-sm text-white/60 hover:text-white">
          ← Back to generator
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const totalCredits = (order.compute?.gpuHoursRequested ?? 0) * 60;
  const usedCredits = order.compute?.totalCreditsUsed ?? 0;
  const agents = order.orchestration?.agents ?? [];

  return (
    <div className="space-y-6">
      {/* ─ Header ─ */}
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,27,0.96),rgba(4,8,16,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-soft)]">
                Live Dashboard
              </p>
              {!isTerminal ? (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[0.65rem] text-amber-300">
                  <Activity className="h-3 w-3" />
                  Polling
                </span>
              ) : null}
            </div>
            <h1 className="font-[var(--font-display)] text-3xl text-white md:text-4xl">
              {order.customerName}&apos;s run
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Order <span className="font-mono text-xs text-white/70">{order.id}</span> · {order.jobType} ·{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusColor(order.status)}`}
            >
              <StatusIcon status={order.status} />
              {order.status}
            </div>
          </div>
        </div>

        {/* Credit Gauge */}
        {totalCredits > 0 ? (
          <div className="mt-5">
            <CreditGauge used={usedCredits} total={totalCredits} />
          </div>
        ) : null}
      </div>

      {/* ─ Agent steps ─ */}
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,27,0.94),rgba(4,8,16,0.98))] p-6">
        <div className="mb-4 flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Trinity Agents
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.65rem] text-white/50">
            {agents.length} step{agents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {agents.length === 0 ? (
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-dashed border-white/10 px-5 py-8 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for Trinity to dispatch agent steps...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard key={agent.stepId} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {/* ─ Logs + Artifacts ─ */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(5,10,20,0.96),rgba(3,6,14,0.98))] p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">Logs</p>
          <pre
            ref={logRef}
            className="max-h-[28rem] min-h-[16rem] overflow-auto rounded-[1.5rem] border border-white/[0.08] bg-black/[0.35] p-5 font-mono text-xs leading-6 text-[#efe6d7]"
          >
            {logs || "No logs yet. Waiting for execution..."}
          </pre>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,27,0.94),rgba(4,8,16,0.98))] p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Artifacts
          </p>
          <div className="space-y-3">
            {artifacts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 px-4 py-5 text-sm text-white/40">
                No artifacts yet.
              </div>
            ) : (
              artifacts.map((artifact) => (
                <div
                  key={artifact.name}
                  className="rounded-[1.3rem] border border-white/[0.08] bg-black/20 p-4"
                >
                  <div className="text-sm font-medium text-white">{artifact.name}</div>
                  <div className="mt-1 text-xs text-white/40">
                    {artifact.contentType} · {artifact.sizeBytes} bytes
                  </div>
                  <a
                    href={artifactDownloadUrl(orderId, artifact.name)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ─ Footer nav ─ */}
      <div className="flex items-center justify-center gap-6 text-sm text-white/40">
        <Link href="/" className="transition hover:text-white">
          ← Home
        </Link>
        <Link href="/generate" className="transition hover:text-white">
          Create another order
        </Link>
        <Link href={`/orders/${orderId}`} className="transition hover:text-white">
          Static view
        </Link>
      </div>
    </div>
  );
}
