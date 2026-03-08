// ---------------------------------------------------------------------------
// AgentAdapter — common interface for all agent adapters
// ---------------------------------------------------------------------------

import type { AgentCapability, AgentInvocation, AgentResult } from "../types";

export interface AgentAdapter {
  readonly capability: AgentCapability;
  /** Returns true if the underlying CLI binary is present and callable */
  checkAvailability(): Promise<boolean>;
  /** Run the agent on the given invocation and return a structured result */
  execute(invocation: AgentInvocation): Promise<AgentResult>;
  /** Rough cost estimate (relative units) based on prompt length */
  estimateCost(prompt: string): number;
}
