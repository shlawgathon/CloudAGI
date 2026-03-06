import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatus } from "@/components/order-status";
import { StatusSearch } from "@/components/status-search";
import { fetchArtifacts, fetchLogs, fetchOrder } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [order, logs, artifacts] = await Promise.all([
      fetchOrder(id),
      fetchLogs(id),
      fetchArtifacts(id)
    ]);

    return (
      <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-[var(--shadow)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
              CloudAGI Status
            </p>
            <h1 className="font-[var(--font-display)] text-4xl text-white">
              Track a paid run from start to artifact.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              This page reflects the order, the Modal run, and the delivered output surface from the
              current Bun API.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:min-w-[22rem]">
            <StatusSearch initialOrderId={id} />
            <Link
              href="/"
              className="text-center text-sm text-[var(--muted)] transition hover:text-white"
            >
              Back to order form
            </Link>
          </div>
        </header>

        <OrderStatus order={order} logs={logs} artifacts={artifacts} />
      </main>
    );
  } catch {
    notFound();
  }
}
