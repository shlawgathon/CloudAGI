import { OrderForm } from "@/components/order-form";
import { StatusSearch } from "@/components/status-search";

const promise =
  "Pay through Nevermined, send the workload, get a completed GPU run plus logs and outputs.";

const offer = [
  "CloudAGI Fast Run",
  "Fixed Nevermined plan",
  "One GPU job credit",
  "Up to 30 minutes runtime",
  "Logs + output artifact"
];

const flow = [
  "Create an order with the command, repo, and expected output.",
  "Get the Nevermined plan metadata CloudAGI exposes for the paid run.",
  "Order the plan through Nevermined and generate an x402 token.",
  "Call the paid start endpoint and let CloudAGI run the job on Modal."
];

const scope = [
  "Inference, evals, batch transforms, and one-off scripted model runs.",
  "One operator, one backend, one fixed offer.",
  "No marketplace, no provider onboarding, no pricing engine."
];

const proofs = [
  "Nevermined-gated paid start endpoint",
  "Modal-backed execution",
  "Order status, logs, and artifact retrieval"
];

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
              CA
            </div>
            <div>
              <div className="font-[var(--font-display)] text-xl">CloudAGI</div>
              <div className="text-sm text-[var(--muted)]">Direct GPU execution, not a marketplace</div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <a href="#offer" className="transition hover:text-white">
              Offer
            </a>
            <a href="#payment-flow" className="transition hover:text-white">
              Payment Flow
            </a>
            <a href="#create-order" className="transition hover:text-white">
              Order
            </a>
            <a href="#status" className="transition hover:text-white">
              Status
            </a>
          </nav>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] px-7 py-8 shadow-[var(--shadow)] backdrop-blur sm:px-10 sm:py-10">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">
              CloudAGI Fast Run
            </p>
            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
              Ship the paid AI job first. Build the platform later.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              {promise}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#create-order"
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#ff7a45]"
              >
                Create paid order
              </a>
              <a
                href="#status"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-[var(--muted)] transition hover:border-white/20 hover:text-white"
              >
                View status
              </a>
            </div>
          </div>

          <aside
            id="offer"
            className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(242,111,60,0.18),rgba(255,255,255,0.02))] p-7 shadow-[var(--shadow)]"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
              Launch Offer
            </p>
            <ul className="space-y-3">
              {offer.map((item) => (
                <li
                  key={item}
                  className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white"
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Product Scope
            </p>
            <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              {scope.map((item) => (
                <div key={item} className="rounded-[1.25rem] bg-black/20 px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            id="payment-flow"
            className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 lg:col-span-2"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Payment Flow
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {flow.map((item, index) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#09111d]">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-7 text-[var(--muted)]">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div
            id="create-order"
            className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-1"
          >
            <OrderForm />
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
                What the frontend proves
              </p>
              <div className="space-y-3">
                {proofs.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-white/8 bg-black/20 px-4 py-4 text-sm text-[var(--muted)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              id="status"
              className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6"
            >
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
                Order Status
              </p>
              <h2 className="font-[var(--font-display)] text-3xl text-white">
                One page for logs, artifacts, and execution state.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Paste an order ID to jump directly into the live run view.
              </p>
              <div className="mt-6">
                <StatusSearch />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
