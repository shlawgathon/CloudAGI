import { ArrowLeft } from "lucide-react";
import { AgentApiDocs } from "@/components/generate/agent-api-docs";

export default function GenerateApiPage() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(101,255,225,0.14),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(255,178,115,0.14),transparent_24%)]" />

      <div className="mx-auto w-full max-w-[92rem] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <header className="mb-5 flex flex-col gap-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/generate"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <div className="font-[var(--font-display)] text-xl text-white">Generate API</div>
              <div className="text-sm text-[var(--muted)]">
                Full request and response examples for agent callers
              </div>
            </div>
          </div>
        </header>

        <AgentApiDocs />
      </div>
    </main>
  );
}
