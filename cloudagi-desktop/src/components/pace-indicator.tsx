import { useState } from "react";

interface PaceIndicatorProps {
  status: "ahead" | "on-track" | "over";
}

const statusConfig = {
  ahead: { color: "bg-success", label: "Ahead of pace" },
  "on-track": { color: "bg-warning", label: "On track" },
  over: { color: "bg-danger", label: "Over pace" },
} as const;

export function PaceIndicator({ status }: PaceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = statusConfig[status];

  return (
    <span
      className="relative inline-flex items-center ml-1.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.color} inline-block`}
        aria-label={config.label}
      />
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs
                     bg-card-hover text-text-primary rounded-md whitespace-nowrap
                     border border-border shadow-lg z-10"
          role="tooltip"
        >
          {config.label}
        </span>
      )}
    </span>
  );
}
