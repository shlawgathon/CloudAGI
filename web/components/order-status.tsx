import { artifactDownloadUrl } from "@/lib/api";
import type { Artifact, Order } from "@/lib/types";

function statusTone(status: Order["status"]) {
  switch (status) {
    case "succeeded":
      return "text-[var(--success)] border-[color:rgba(114,208,166,0.35)] bg-[rgba(114,208,166,0.08)]";
    case "failed":
      return "text-red-200 border-red-400/25 bg-red-500/10";
    case "running":
      return "text-[var(--accent-2)] border-[color:rgba(243,195,139,0.24)] bg-[rgba(243,195,139,0.08)]";
    default:
      return "text-[var(--muted)] border-white/10 bg-white/5";
  }
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-sm text-white">{value}</div>
    </div>
  );
}

export function OrderStatus({
  order,
  logs,
  artifacts
}: {
  order: Order;
  logs: string;
  artifacts: Artifact[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
              Order Status
            </p>
            <h1 className="font-[var(--font-display)] text-4xl text-white">
              {order.customerName}&apos;s CloudAGI run
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Track the exact paid run, review the command, inspect logs, and download delivered
              artifacts.
            </p>
          </div>
          <div
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${statusTone(order.status)}`}
          >
            {order.status}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Detail label="Order ID" value={<span className="break-all font-mono text-xs">{order.id}</span>} />
          <Detail label="Price" value={`${order.priceUsdc} USDC`} />
          <Detail label="Job Type" value={order.jobType} />
          <Detail
            label="Created"
            value={new Date(order.createdAt).toLocaleString()}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Execution
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Detail
              label="Command"
              value={<span className="font-mono text-xs">{order.command.join(" ")}</span>}
            />
            <Detail
              label="Modal Sandbox"
              value={order.modalSandboxId || "Not available yet"}
            />
            <Detail label="Expected Output" value={order.expectedOutput} />
            <Detail label="Contact" value={order.contact} />
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Input Notes</div>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/88">
              {order.inputNotes}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Payment Handle
          </p>
          <div className="space-y-4 text-sm text-[var(--muted)]">
            <div>
              CloudAGI uses Nevermined to gate the paid start endpoint. If your backend is
              configured, the plan and agent IDs are attached to the order.
            </div>
            <Detail label="Agent ID" value={order.nevermined?.agentId || "Not configured"} />
            <Detail label="Plan ID" value={order.nevermined?.planId || "Not configured"} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[var(--panel-strong)] p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">Logs</p>
          <pre className="min-h-[22rem] overflow-x-auto rounded-[1.5rem] border border-white/8 bg-black/35 p-5 font-mono text-xs leading-6 text-[#efe6d7]">
            {logs || "No logs yet."}
          </pre>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Artifacts
          </p>
          <div className="space-y-3">
            {artifacts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 px-4 py-5 text-sm text-[var(--muted)]">
                No artifacts yet.
              </div>
            ) : (
              artifacts.map((artifact) => (
                <div
                  key={artifact.name}
                  className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4"
                >
                  <div className="text-sm font-medium text-white">{artifact.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {artifact.contentType} · {artifact.sizeBytes} bytes
                  </div>
                  <a
                    href={artifactDownloadUrl(order.id, artifact.name)}
                    className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09111d] transition hover:bg-[var(--accent-2)]"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
