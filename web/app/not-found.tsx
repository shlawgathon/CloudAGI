import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card-surface w-full max-w-xl rounded-[2rem] p-8 text-center shadow-[var(--shadow)]">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">Not Found</p>
        <h1 className="font-[var(--font-display)] text-4xl text-white">Order not found</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          The order ID does not exist in the current backend state, or the Bun API is not running.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="accent-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(240,125,73,0.32)]"
          >
            Return to CloudAGI
          </Link>
        </div>
      </div>
    </main>
  );
}
