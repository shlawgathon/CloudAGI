import type { CreditBalance } from "../types";
import { calculatePacePercent } from "../types";
import { ProgressBar } from "./progress-bar";
import { ResetTimer } from "./reset-timer";
import { RefreshButton } from "./refresh-button";

interface ProviderCardProps {
  provider: CreditBalance;
  onRefresh: (id: string) => Promise<void>;
}

function planBadgeColor(plan: string): string {
  const lower = plan.toLowerCase();
  if (lower.includes("pro")) return "bg-accent/20 text-accent";
  if (lower.includes("team") || lower.includes("enterprise"))
    return "bg-blue-500/20 text-blue-400";
  if (lower.includes("free")) return "bg-text-muted/20 text-text-muted";
  return "bg-white/10 text-text-secondary";
}

export function ProviderCard({ provider, onRefresh }: ProviderCardProps) {
  const pacePercent = calculatePacePercent(provider.resetDate);

  return (
    <div
      className="group relative rounded-xl border border-border bg-card p-4
                 backdrop-blur-sm transition-all duration-200
                 hover:border-border-hover hover:bg-card-hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Provider color dot */}
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: provider.color }}
            aria-hidden="true"
          />
          <h3 className="text-base font-medium text-text-primary">
            {provider.provider}
          </h3>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${planBadgeColor(provider.plan)}`}
          >
            {provider.plan}
          </span>
        </div>
        <RefreshButton
          onRefresh={() => onRefresh(provider.id)}
        />
      </div>

      {/* Metrics */}
      <div className="space-y-0">
        {provider.metrics.map((metric) => (
          <ProgressBar
            key={metric.name}
            name={metric.name}
            used={metric.used}
            limit={metric.limit}
            unit={metric.unit}
            pacePercent={pacePercent}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border">
        <ResetTimer resetDate={provider.resetDate} />
      </div>
    </div>
  );
}
