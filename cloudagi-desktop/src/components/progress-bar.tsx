import { usagePercent, paceStatus } from "../types";
import { PaceIndicator } from "./pace-indicator";

interface ProgressBarProps {
  name: string;
  used: number;
  limit: number;
  unit?: string;
  pacePercent: number;
}

function fillColor(pct: number): string {
  if (pct < 60) return "bg-success";
  if (pct <= 85) return "bg-warning";
  return "bg-danger";
}

function formatValue(value: number, unit?: string): string {
  const suffix = unit ? ` ${unit}` : "";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M${suffix}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K${suffix}`;
  }
  // Round decimals for clean display
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${display}${suffix}`;
}

export function ProgressBar({
  name,
  used,
  limit,
  unit,
  pacePercent,
}: ProgressBarProps) {
  const pct = usagePercent(used, limit);
  const pace = paceStatus(pct, pacePercent);

  return (
    <div className="mb-3 last:mb-0">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-text-secondary flex items-center">
          {name}
          <PaceIndicator status={pace} />
        </span>
        <span className="text-sm text-text-secondary font-mono">
          {formatValue(used, unit)} / {formatValue(limit, unit)}
        </span>
      </div>

      {/* Bar container */}
      <div className="relative h-3 w-full rounded-full bg-[#232325] overflow-hidden">
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillColor(pct)}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${name}: ${used} of ${limit}${unit ? ` ${unit}` : ""} used`}
        />

        {/* Pace marker */}
        {pacePercent > 0 && pacePercent < 100 && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/50 rounded-full"
            style={{ left: `${pacePercent}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
