// ---------------------------------------------------------------------------
// Agent Economy — shared type definitions
// ---------------------------------------------------------------------------

export type AgentId = "claude-code" | "codex" | "opencode";

export type RoutingStrategy = "auto" | "cheapest" | "fastest" | "best-quality";

export interface AgentCapability {
  id: AgentId;
  name: string;
  /** Links to a credit plugin (e.g., "claude", "codex", "openrouter") */
  providerId: string;
  languages: string[];
  maxPromptLength: number;
  /** Relative cost score 0–1 (higher = more expensive) */
  costPerTask: number;
  /** Relative speed score 0–1 (higher = faster) */
  speedScore: number;
  /** Relative quality score 0–1 (higher = better output) */
  qualityScore: number;
}

export interface AgentInvocation {
  taskId: string;
  prompt: string;
  workingDirectory?: string;
  maxTurns?: number;
  outputFormat?: "json" | "text";
}

export interface AgentResult {
  success: boolean;
  output: string;
  exitCode: number;
  durationMs: number;
  tokensUsed?: number;
  error?: string;
}
