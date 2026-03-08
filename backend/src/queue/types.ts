// ---------------------------------------------------------------------------
// Task Queue — shared type definitions
// ---------------------------------------------------------------------------

import type { AgentId, AgentResult, RoutingStrategy } from "../agents/types";

export type TaskStatus =
  | "pending"
  | "routing"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface TaskInput {
  prompt: string;
  /** Routing strategy (default: "auto") */
  strategy?: RoutingStrategy;
  /** Pin execution to a specific agent */
  preferredAgent?: AgentId;
  workingDirectory?: string;
  maxTurns?: number;
}

export interface RoutingScore {
  agentId: string;
  score: number;
  breakdown: {
    cost: number;
    speed: number;
    quality: number;
    langBonus: number;
    creditBonus: number;
  };
}

export interface TaskRecord {
  id: string;
  prompt: string;
  strategy: RoutingStrategy;
  agentId: AgentId | null;
  status: TaskStatus;
  result: AgentResult | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
  routingDecision?: {
    scores: RoutingScore[];
    selectedAgent: string;
    reason: string;
  };
  /** Agent to pin execution to (carried through from TaskInput) */
  preferredAgent?: AgentId;
  /** Working directory to pass to the agent executor */
  workingDirectory?: string;
  /** Maximum number of agentic turns */
  maxTurns?: number;
}
