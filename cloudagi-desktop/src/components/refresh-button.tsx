import { useState, useEffect, useCallback } from "react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  cooldownSeconds?: number;
}

export function RefreshButton({
  onRefresh,
  cooldownSeconds = 30,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const inCooldown = cooldownRemaining > 0;

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleClick = useCallback(async () => {
    if (isRefreshing || inCooldown) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      setCooldownRemaining(cooldownSeconds);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, inCooldown, cooldownSeconds]);

  const formatCooldown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isRefreshing || inCooldown}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                   p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30
                   disabled:cursor-not-allowed focus:outline-none
                   focus-visible:ring-1 focus-visible:ring-accent focus-visible:opacity-100"
        aria-label={
          inCooldown
            ? `Refresh available in ${formatCooldown(cooldownRemaining)}`
            : "Refresh credits"
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-text-secondary ${isRefreshing ? "animate-spin" : ""}`}
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6" />
          <path d="M2.5 11.5a10 10 0 0 1 18.14-4.5M21.5 12.5a10 10 0 0 1-18.14 4.5" />
        </svg>
      </button>

      {/* Cooldown tooltip */}
      {showTooltip && inCooldown && (
        <span
          className="absolute bottom-full right-0 mb-1.5 px-2 py-1 text-xs
                     bg-card-hover text-text-primary rounded-md whitespace-nowrap
                     border border-border shadow-lg z-10"
          role="tooltip"
        >
          Refresh available in {formatCooldown(cooldownRemaining)}
        </span>
      )}
    </div>
  );
}
