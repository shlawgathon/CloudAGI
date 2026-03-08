// ---------------------------------------------------------------------------
// Agent Registry — central map of all registered adapters
// ---------------------------------------------------------------------------

import type { AgentId } from "./types";
import type { AgentAdapter } from "./adapters/adapter";
import { ClaudeCodeAdapter } from "./adapters/claude-code";
import { CodexAdapter } from "./adapters/codex";
import { OpenCodeAdapter } from "./adapters/opencode";

export const agentRegistry: Map<AgentId, AgentAdapter> = new Map();

// Register all adapters on module load
agentRegistry.set("claude-code", new ClaudeCodeAdapter());
agentRegistry.set("codex", new CodexAdapter());
agentRegistry.set("opencode", new OpenCodeAdapter());

/** Returns the adapter for the given agent ID, or undefined if not registered */
export function getAgent(id: AgentId): AgentAdapter | undefined {
  return agentRegistry.get(id);
}

/** Returns all registered adapters */
export function getAllAgents(): AgentAdapter[] {
  return Array.from(agentRegistry.values());
}

/**
 * Returns only those adapters whose underlying CLI binary is available.
 * Results are cached in the `agent_checks` table by the caller when needed;
 * here we just run the checks in parallel.
 */
export async function getAvailableAgents(): Promise<AgentAdapter[]> {
  const adapters = getAllAgents();
  const checks = await Promise.all(
    adapters.map(async (adapter) => {
      const available = await adapter.checkAvailability();
      return { adapter, available };
    })
  );
  return checks.filter((c) => c.available).map((c) => c.adapter);
}
