import { useState } from "react";
import { formatRelativeTime, formatAbsoluteDate } from "../types";

interface ResetTimerProps {
  resetDate: string | null;
}

export function ResetTimer({ resetDate }: ResetTimerProps) {
  const [showAbsolute, setShowAbsolute] = useState(false);

  if (!resetDate) {
    return (
      <span className="text-xs text-text-muted select-none">
        No reset date
      </span>
    );
  }

  const label = showAbsolute
    ? `Resets ${formatAbsoluteDate(resetDate)}`
    : `Resets in ${formatRelativeTime(resetDate)}`;

  return (
    <button
      type="button"
      onClick={() => setShowAbsolute((prev) => !prev)}
      className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer
                 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
                 rounded px-1 -mx-1"
      aria-label={showAbsolute ? "Show relative time" : "Show absolute date"}
    >
      {label}
    </button>
  );
}
