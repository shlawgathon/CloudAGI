/** Credit metric within a provider (e.g., "API Requests", "Tokens") */
export interface CreditMetric {
  name: string;
  used: number;
  limit: number;
  unit?: string;
}

/** A single provider's credit balance */
export interface CreditBalance {
  id: string;
  provider: string;
  plan: string;
  color: string;
  metrics: CreditMetric[];
  resetDate: string | null;
  status: "healthy" | "warning" | "over-budget" | "disabled";
  lastRefreshed: string;
}

/** Available agent for task routing */
export interface AgentInfo {
  id: string;
  name: string;
  provider: string;
  color: string;
  capabilities: string[];
  pricePerTask: number;
  currency: string;
  status: "online" | "offline" | "degraded";
}

/** Task submission request */
export interface TaskSubmission {
  prompt: string;
  strategy: TaskStrategy;
}

/** Routing strategies */
export type TaskStrategy = "auto" | "cheapest" | "fastest" | "best-quality";

/** Task record from backend */
export interface TaskRecord {
  id: string;
  prompt: string;
  strategy: TaskStrategy;
  status: "pending" | "running" | "succeeded" | "failed" | "routing" | "canceled";
  assignedAgent: string | null;
  result: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

/** App view states */
export type AppView = "overview" | "detail" | "tasks";

/** Calculate pace percentage based on reset date */
export function calculatePacePercent(resetDate: string | null): number {
  if (!resetDate) return 50;

  const now = new Date();
  const reset = new Date(resetDate);

  // Assume monthly billing cycle (30 days)
  const cycleDays = 30;
  const cycleStart = new Date(reset);
  cycleStart.setDate(cycleStart.getDate() - cycleDays);

  const totalMs = reset.getTime() - cycleStart.getTime();
  const elapsedMs = now.getTime() - cycleStart.getTime();

  return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
}

/** Format relative time from now */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "Expired";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Format absolute date */
export function formatAbsoluteDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Usage percentage */
export function usagePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

/** Determine pace status */
export function paceStatus(
  usagePct: number,
  pacePct: number
): "ahead" | "on-track" | "over" {
  const diff = usagePct - pacePct;
  if (diff < -5) return "ahead";
  if (diff > 5) return "over";
  return "on-track";
}
