// ---------------------------------------------------------------------------
// Credit Monitoring — shared type definitions
// ---------------------------------------------------------------------------

export type ProviderId =
  | "claude"
  | "codex"
  | "cursor"
  | "copilot"
  | "openrouter"
  | "amp"
  | "windsurf"
  | "manual";

// ---------------------------------------------------------------------------
// Metric line variants displayed in the UI
// ---------------------------------------------------------------------------

export interface ProgressLine {
  type: "progress";
  label: string;
  used: number;
  limit: number;
  /** ISO 8601 timestamp when the usage cycle resets */
  resetAt?: string;
  /** Expected % consumed at this point in the billing cycle */
  pacePercent?: number;
}

export interface TextLine {
  type: "text";
  label: string;
  value: string;
}

export interface BadgeLine {
  type: "badge";
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export type MetricLine = ProgressLine | TextLine | BadgeLine;

// ---------------------------------------------------------------------------
// Plugin probe result
// ---------------------------------------------------------------------------

export interface ProbeResult {
  plan?: string;
  lines: MetricLine[];
  /** Human-readable error message when probe fails */
  error?: string;
}

// ---------------------------------------------------------------------------
// Plugin metadata — drives the UI column layout
// ---------------------------------------------------------------------------

export interface LineDefinition {
  type: "progress" | "text" | "badge";
  label: string;
  scope: "overview" | "detail";
  /** Lower = shown first in overview cards */
  primaryOrder?: number;
}

export interface CreditPlugin {
  id: ProviderId;
  name: string;
  icon: string;
  brandColor: string;
  links: Array<{ label: string; url: string }>;
  lines: LineDefinition[];
  probe(): Promise<ProbeResult>;
}

// ---------------------------------------------------------------------------
// Persistence layer types
// ---------------------------------------------------------------------------

export interface CreditSnapshot {
  id?: number;
  providerId: ProviderId;
  plan: string | null;
  used: number;
  limit: number;
  resetAt: string | null;
  pacePercent: number | null;
  snapshotAt: string;
}

export interface CreditBalance {
  providerId: ProviderId;
  name: string;
  icon: string;
  brandColor: string;
  enabled: boolean;
  plan: string | null;
  lines: MetricLine[];
  lastRefresh: string | null;
  error: string | null;
}

export interface ProviderConfig {
  providerId: ProviderId;
  enabled: boolean;
  refreshIntervalMins: number;
  config: Record<string, unknown>;
}
