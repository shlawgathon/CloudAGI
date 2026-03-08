import { registerService } from "../registry";
import type { ServiceResult } from "../registry";

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const prompt = body.prompt as string | undefined;
  if (!prompt?.trim()) {
    return { success: false, error: "prompt is required" };
  }

  const strategy = (body.strategy as string) || "auto";
  const validStrategies = ["auto", "cheapest", "fastest", "best-quality"];
  if (!validStrategies.includes(strategy)) {
    return {
      success: false,
      error: `Invalid strategy. Must be one of: ${validStrategies.join(", ")}`,
    };
  }

  const preferredAgent = body.preferredAgent as string | undefined;
  const maxTurns = (body.maxTurns as number) || 25;

  // Lazy import to avoid circular dependency issues at startup
  const { taskWorker } = await import("../../queue/worker");

  const task = await taskWorker.submitTask({
    prompt: prompt.trim(),
    strategy: strategy as "auto" | "cheapest" | "fastest" | "best-quality",
    preferredAgent: preferredAgent as
      | "claude-code"
      | "codex"
      | "opencode"
      | undefined,
    maxTurns,
  });

  // Poll for completion (max 5 min)
  const deadline = Date.now() + 300_000;
  const { taskStore } = await import("../../queue/store");

  while (Date.now() < deadline) {
    const current = taskStore.get(task.id);
    if (!current) break;

    if (current.status === "succeeded" || current.status === "failed") {
      return {
        success: current.status === "succeeded",
        data: {
          taskId: current.id,
          status: current.status,
          agentId: current.agentId,
          result: current.result,
          durationMs: current.durationMs,
          routingDecision: current.routingDecision,
        },
        error: current.error || undefined,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timed out — return the task id for polling
  return {
    success: true,
    data: {
      taskId: task.id,
      status: "running",
      message:
        "Task is still running. Poll GET /v1/tasks/:id for updates.",
    },
  };
}

registerService({
  id: "coding-task",
  name: "Coding Task Router",
  description:
    "CloudAGI Coding Task Router — routes coding tasks to the best available AI agent (Claude Code, Codex, or OpenCode) based on cost, speed, quality, and credit availability. Supports auto, cheapest, fastest, and best-quality routing strategies.",
  category: "compute",
  priceLabel: "0.50 USDC",
  priceAmount: "0.50",
  priceCurrency: "USDC",
  tags: [
    "coding",
    "agent",
    "router",
    "claude-code",
    "codex",
    "opencode",
    "task",
    "marketplace",
  ],
  handler,
});
