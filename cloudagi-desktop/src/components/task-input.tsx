import { useState, useCallback } from "react";
import type { TaskStrategy, AgentInfo } from "../types";

interface TaskInputProps {
  agents: AgentInfo[];
  onSubmit: (prompt: string, strategy: TaskStrategy) => Promise<void>;
}

const strategies: { value: TaskStrategy; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "best-quality", label: "Best" },
];

export function TaskInput({ agents, onSubmit }: TaskInputProps) {
  const [prompt, setPrompt] = useState("");
  const [strategy, setStrategy] = useState<TaskStrategy>("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routingTo, setRoutingTo] = useState<AgentInfo | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim() || isSubmitting) return;

      setIsSubmitting(true);

      // Show a random routing agent for visual feedback
      if (agents.length > 0) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        setRoutingTo(randomAgent);
      }

      try {
        await onSubmit(prompt.trim(), strategy);
        setPrompt("");
      } finally {
        setIsSubmitting(false);
        setRoutingTo(null);
      }
    },
    [prompt, strategy, isSubmitting, agents, onSubmit]
  );

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
      {/* Routing indicator */}
      {routingTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-text-secondary animate-pulse">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              backgroundColor: routingTo.color + "33",
              color: routingTo.color,
            }}
          >
            {routingTo.name.charAt(0)}
          </div>
          <span>Routing to {routingTo.name}...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Text input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a coding task..."
            disabled={isSubmitting}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm
                       text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                       disabled:opacity-50 transition-all duration-200"
          />
        </div>

        {/* Strategy selector */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {strategies.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStrategy(s.value)}
              disabled={isSubmitting}
              className={`px-2.5 py-2 text-xs font-medium transition-all duration-150
                         focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
                         disabled:opacity-50
                         ${
                           strategy === s.value
                             ? "bg-accent text-background"
                             : "bg-transparent text-text-secondary hover:bg-white/5"
                         }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!prompt.trim() || isSubmitting}
          className="px-4 py-2.5 bg-accent text-background text-sm font-semibold rounded-lg
                     transition-all duration-200 shrink-0
                     hover:bg-accent/90 active:scale-95
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Submit task"
        >
          {isSubmitting ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="animate-spin"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
