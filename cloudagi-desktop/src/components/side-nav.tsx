import type { CreditBalance, AppView } from "../types";

interface SideNavProps {
  providers: CreditBalance[];
  selectedId: string | null;
  view: AppView;
  onSelectProvider: (id: string) => void;
  onSelectView: (view: AppView) => void;
}

const statusColors: Record<CreditBalance["status"], string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  "over-budget": "bg-danger",
  disabled: "bg-text-muted",
};

export function SideNav({
  providers,
  selectedId,
  view,
  onSelectProvider,
  onSelectView,
}: SideNavProps) {
  return (
    <nav
      className="flex flex-col items-center w-[60px] min-w-[60px] bg-card/50 border-r border-border
                 py-3 px-2 gap-2"
      aria-label="Provider navigation"
    >
      {/* CloudAGI logo */}
      <button
        type="button"
        onClick={() => onSelectView("overview")}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
                   transition-all duration-200 shrink-0 cursor-pointer
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                   ${
                     view === "overview" && !selectedId
                       ? "bg-accent text-background"
                       : "bg-accent-dim text-accent hover:bg-accent/30"
                   }`}
        aria-label="Overview"
        title="Overview"
      >
        C
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-border my-1" aria-hidden="true" />

      {/* Provider icons */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {providers.map((p) => {
          const isActive = selectedId === p.id && view === "detail";

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectProvider(p.id);
                onSelectView("detail");
              }}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center
                         text-sm font-semibold transition-all duration-200 shrink-0
                         cursor-pointer focus:outline-none focus-visible:ring-2
                         focus-visible:ring-accent
                         ${
                           isActive
                             ? "ring-2 ring-accent"
                             : "hover:ring-1 hover:ring-border-hover"
                         }`}
              style={{
                backgroundColor: isActive ? p.color + "33" : p.color + "1A",
                color: p.color,
              }}
              aria-label={p.provider}
              title={p.provider}
            >
              {p.provider.charAt(0).toUpperCase()}

              {/* Status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2
                           border-card ${statusColors[p.status]}`}
                aria-label={`${p.provider} status: ${p.status}`}
              />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-border my-1" aria-hidden="true" />

      {/* Tasks icon */}
      <button
        type="button"
        onClick={() => onSelectView("tasks")}
        className={`w-10 h-10 rounded-xl flex items-center justify-center
                   transition-all duration-200 shrink-0 cursor-pointer
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                   ${
                     view === "tasks"
                       ? "bg-accent-dim text-accent ring-2 ring-accent"
                       : "bg-white/5 text-text-secondary hover:bg-white/10"
                   }`}
        aria-label="Tasks"
        title="Tasks"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
    </nav>
  );
}
