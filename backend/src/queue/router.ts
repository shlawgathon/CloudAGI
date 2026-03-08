// ---------------------------------------------------------------------------
// Task Router — scoring-based agent selection
// ---------------------------------------------------------------------------

import type { AgentId, RoutingStrategy } from "../agents/types";
import type { AgentAdapter } from "../agents/adapters/adapter";
import { getAvailableAgents } from "../agents/registry";
import type { RoutingScore } from "./types";

// ---------------------------------------------------------------------------
// Strategy weights
// ---------------------------------------------------------------------------

const STRATEGY_WEIGHTS: Record<
  RoutingStrategy,
  { cost: number; speed: number; quality: number }
> = {
  auto: { cost: 0.3, speed: 0.3, quality: 0.4 },
  cheapest: { cost: 0.8, speed: 0.1, quality: 0.1 },
  fastest: { cost: 0.1, speed: 0.8, quality: 0.1 },
  "best-quality": { cost: 0.1, speed: 0.1, quality: 0.8 },
};

// ---------------------------------------------------------------------------
// Language detection (keyword-based heuristic)
// ---------------------------------------------------------------------------

const LANG_KEYWORDS: Record<string, string[]> = {
  typescript: ["typescript", "ts", ".ts", "tsx", "interface ", "type "],
  javascript: ["javascript", "js", ".js", "jsx", "const ", "let ", "var "],
  python: ["python", ".py", "def ", "import ", "pip ", "async def"],
  rust: ["rust", ".rs", "fn ", "cargo", "impl ", "struct "],
  go: ["golang", " go ", ".go", "func ", "goroutine", "package main"],
  java: ["java", ".java", "public class", "import java"],
  c: [" c ", ".c ", "#include", "printf(", "malloc("],
  cpp: ["c++", ".cpp", ".hpp", "#include <", "std::"],
};

function detectLanguage(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const [lang, keywords] of Object.entries(LANG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return lang;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Optional credit headroom integration
// ---------------------------------------------------------------------------

// Minimal structural interface — matches the subset of CreditMonitor we use.
// getBalance() is synchronous on CreditMonitor; we accept sync | async so the
// type stays compatible if an async implementation is provided in future.
type CreditMonitorLike = {
  getBalance?: (
    providerId: string,
  ) =>
    | { lines: Array<{ type: string; used?: number; limit?: number }> }
    | null
    | Promise<{ lines: Array<{ type: string; used?: number; limit?: number }> } | null>;
};

let creditMonitor: CreditMonitorLike | null = null;
let creditMonitorLoaded = false;

async function tryGetCreditMonitor(): Promise<CreditMonitorLike | null> {
  if (creditMonitorLoaded) return creditMonitor;
  creditMonitorLoaded = true;
  try {
    // Use a variable so TypeScript doesn't try to statically resolve the module.
    // The module may not exist yet — that's expected during development.
    const path = "../credits/monitor";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod = await (import(path) as Promise<unknown>);
    creditMonitor =
      (mod as { creditMonitor?: CreditMonitorLike }).creditMonitor ?? null;
  } catch {
    creditMonitor = null;
  }
  return creditMonitor;
}

/**
 * Returns a value in [0, 1] representing how much credit headroom the provider
 * has left.  1 = fully unused, 0 = exhausted or data unavailable.
 *
 * We inspect the first "progress" line in the balance snapshot because that is
 * where plugins record (used / limit) data (see credits/types.ts ProgressLine).
 */
async function getCreditHeadroom(providerId: string): Promise<number> {
  try {
    const monitor = await tryGetCreditMonitor();
    if (!monitor?.getBalance) return 0;
    const balance = await monitor.getBalance(providerId);
    if (!balance) return 0;
    const progressLine = balance.lines.find((l) => l.type === "progress");
    if (!progressLine) return 0;
    const used = progressLine.used ?? 0;
    const limit = progressLine.limit ?? 0;
    if (limit === 0) return 0;
    return (limit - used) / limit; // 0 = empty, 1 = full headroom
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Routing result
// ---------------------------------------------------------------------------

export interface RoutingResult {
  agentId: AgentId;
  scores: RoutingScore[];
  reason: string;
}

// ---------------------------------------------------------------------------
// routeTask
// ---------------------------------------------------------------------------

export async function routeTask(
  prompt: string,
  strategy: RoutingStrategy,
  preferredAgent?: AgentId
): Promise<RoutingResult> {
  const available: AgentAdapter[] = await getAvailableAgents();

  if (available.length === 0) {
    // No agents reachable — fall back to a deterministic default that
    // callers can treat as an error state
    return {
      agentId: "claude-code",
      scores: [],
      reason: "No agents available — defaulting to claude-code",
    };
  }

  const weights = STRATEGY_WEIGHTS[strategy];
  const detectedLang = detectLanguage(prompt);

  const scored: RoutingScore[] = await Promise.all(
    available.map(async (adapter) => {
      const cap = adapter.capability;

      // Base score
      const costComponent = weights.cost * (1 - cap.costPerTask);
      const speedComponent = weights.speed * cap.speedScore;
      const qualityComponent = weights.quality * cap.qualityScore;

      // Language bonus
      const langBonus =
        detectedLang && cap.languages.includes(detectedLang) ? 0.1 : 0;

      // Credit headroom bonus — continuous 0–15% weight.
      // headroom is in [0, 1]: 1 = fully unused, 0 = exhausted or unavailable.
      // Agents whose provider has more credits remaining score proportionally
      // higher (e.g. 98% remaining → +0.147, 10% remaining → +0.015).
      const headroom = await getCreditHeadroom(cap.providerId);
      const creditBonus = headroom * 0.15;

      // Preferred agent boost
      const preferBonus = preferredAgent === cap.id ? 0.2 : 0;

      const score =
        costComponent +
        speedComponent +
        qualityComponent +
        langBonus +
        creditBonus +
        preferBonus;

      return {
        agentId: cap.id,
        score,
        breakdown: {
          cost: costComponent,
          speed: speedComponent,
          quality: qualityComponent,
          langBonus,
          creditBonus,
        },
      };
    })
  );

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!;

  const reason =
    preferredAgent && winner.agentId === preferredAgent
      ? `Preferred agent ${preferredAgent} selected (strategy: ${strategy})`
      : `Highest scoring agent for strategy "${strategy}" (score: ${winner.score.toFixed(3)}, lang: ${detectedLang ?? "undetected"})`;

  return {
    agentId: winner.agentId as AgentId,
    scores: scored,
    reason,
  };
}
