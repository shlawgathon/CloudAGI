import { OrderForm } from "@/components/order-form";
import { StatusSearch } from "@/components/status-search";

const promise = "Pay in USDC through Nevermined, send the workload, get a completed GPU run plus logs and outputs.";

const offer = [
  "CloudAGI Fast Run",
  "25 USDC",
  "One GPU job credit",
  "Up to 30 minutes runtime",
  "Logs + output artifact"
];

const flow = [
  "Create an order with the command, repo, and expected output.",
  "Get the Nevermined plan metadata CloudAGI exposes for the paid run.",
  "Order the plan in USDC and generate an x402 token.",
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

const architecture = [
  {
    step: "01",
    title: "Buyer submits paid intent",
    detail: "Create an order with command, inputs, and expected output."
  },
  {
    step: "02",
    title: "Nevermined meters payment",
    detail: "USDC plan + x402 token verifies and settles execution access."
  },
  {
    step: "03",
    title: "Modal runs the workload",
    detail: "CloudAGI launches the command in a Modal sandbox and captures logs."
  },
  {
    step: "04",
    title: "CloudAGI delivers proof",
    detail: "Status page exposes run state, logs, and downloadable artifact."
  }
];

const metrics = [
  { label: "Offer", value: "CloudAGI Fast Run" },
  { label: "Price", value: "25 USDC" },
  { label: "Runtime", value: "Up to 30 min" },
  { label: "Goal", value: "Close paid transaction fast" }
];

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-6 sm:px-8 lg:px-10">
        <header className="card-surface fade-up mb-7 flex flex-col gap-4 rounded-full px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="accent-gradient glow-outline grid h-11 w-11 place-items-center rounded-full text-sm font-semibold text-white">
              CA
            </div>
            <div>
              <div className="font-[var(--font-display)] text-xl">CloudAGI</div>
              <div className="text-sm text-[var(--muted)]">Direct GPU execution business, not a marketplace</div>
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
          <div className="card-surface fade-up rounded-[2.5rem] px-7 py-8 sm:px-10 sm:py-10">
            <span className="badge">Autonomous Business Hackathon Build</span>
            <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Paid AI job execution that behaves like a business.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              {promise}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Goal right now: prove real economic activity quickly, with metered payment before
              compute and clear delivery evidence after compute.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#create-order"
                className="accent-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(240,125,73,0.3)]"
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

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 fade-up delay-${Math.min(index + 1, 3)}`}
                >
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="offer"
            className="fade-up delay-1 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(240,125,73,0.2),rgba(12,25,39,0.88))] p-7 shadow-[var(--shadow)]"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
              Launch Offer
            </p>
            <ul className="space-y-3">
              {offer.map((item) => (
                <li
                  key={item}
                  className="rounded-[1.35rem] border border-white/10 bg-white/20 px-4 py-4 text-sm font-semibold text-[#10253e]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mt-6 card-surface fade-up delay-1 rounded-[2rem] p-6">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[var(--accent-2)]">
            Economic Flow Visual
          </p>
          <h2 className="font-[var(--font-display)] text-4xl text-white">What CloudAGI is proving</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            This is a seller-agent flow for hackathon judging: metered payment, compute execution,
            and verifiable delivery in one loop.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {architecture.map((item, index) => (
              <div
                key={item.step}
                className={`relative rounded-[1.4rem] border border-white/10 bg-white/12 p-4 fade-up delay-${Math.min(index + 1, 3)}`}
              >
                <div className="text-xs tracking-[0.22em] text-[var(--accent-2)]">{item.step}</div>
                <div className="mt-2 text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card-surface fade-up delay-1 rounded-[2rem] p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Product Scope
            </p>
            <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              {scope.map((item) => (
                <div key={item} className="rounded-[1.25rem] bg-white/10 px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            id="payment-flow"
            className="card-surface fade-up delay-2 rounded-[2rem] p-6 lg:col-span-2"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Payment Flow
            </p>
            <h2 className="mb-4 font-[var(--font-display)] text-3xl text-white">
              Metered before compute, visible after compute.
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {flow.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-[1.5rem] border border-white/8 bg-white/12 p-5 fade-up delay-${Math.min(index + 1, 3)}`}
                >
                  <div className="accent-gradient mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">
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
            className="fade-up rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-1"
          >
            <OrderForm />
          </div>

          <div className="space-y-6">
            <div className="card-surface fade-up delay-1 rounded-[2rem] p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
                What the frontend proves
              </p>
              <div className="space-y-3">
                {proofs.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-white/8 bg-white/10 px-4 py-4 text-sm text-[var(--muted)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              id="status"
              className="card-surface fade-up delay-2 rounded-[2rem] p-6"
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
