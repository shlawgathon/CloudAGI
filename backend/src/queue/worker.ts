// ---------------------------------------------------------------------------
// Task Worker — background polling loop
// ---------------------------------------------------------------------------

import { taskStore } from "./store";
import { routeTask } from "./router";
import { agentRegistry } from "../agents/registry";
import type { AgentId } from "../agents/types";
import type { TaskInput, TaskRecord } from "./types";

export class TaskWorker {
  private timer: Timer | null = null;
  private maxConcurrent = 3;
  private running = false;

  /** Start the polling loop */
  start(intervalMs = 1_000): void {
    if (this.timer !== null) return; // already running
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error("[TaskWorker] tick error:", err);
      });
    }, intervalMs);
    console.log(`[TaskWorker] Started (interval=${intervalMs}ms, maxConcurrent=${this.maxConcurrent})`);
  }

  /** Stop the polling loop */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[TaskWorker] Stopped");
    }
  }

  private async tick(): Promise<void> {
    // Guard: don't pile up concurrent ticks
    if (this.running) return;
    this.running = true;
    try {
      await this.processNext();
    } finally {
      this.running = false;
    }
  }

  private async processNext(): Promise<void> {
    // Respect concurrency cap
    const runningCount = taskStore.getRunningCount();
    if (runningCount >= this.maxConcurrent) return;

    // Dequeue next pending task
    const task = taskStore.getNextPending();
    if (!task) return;

    const taskId = task.id;

    try {
      // --- ROUTING ---
      taskStore.updateStatus(taskId, "routing");

      const routingResult = await routeTask(
        task.prompt,
        task.strategy,
        task.agentId ?? undefined
      );

      const agentId: AgentId = routingResult.agentId;

      // --- RUNNING ---
      taskStore.updateStatus(taskId, "running", {
        agentId,
        startedAt: new Date().toISOString(),
        routingDecision: {
          scores: routingResult.scores,
          selectedAgent: agentId,
          reason: routingResult.reason,
        },
      });

      // Retrieve the adapter
      const adapter = agentRegistry.get(agentId);
      if (!adapter) {
        throw new Error(`No adapter registered for agent "${agentId}"`);
      }

      // --- EXECUTE ---
      const result = await adapter.execute({
        taskId,
        prompt: task.prompt,
        workingDirectory: task.workingDirectory,
        maxTurns: task.maxTurns,
        outputFormat: "json",
      });

      // --- COMPLETE ---
      const completedAt = new Date().toISOString();
      taskStore.updateStatus(
        taskId,
        result.success ? "succeeded" : "failed",
        {
          result,
          completedAt,
          durationMs: result.durationMs,
          error: result.error ?? null,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[TaskWorker] Task ${taskId} failed:`, message);
      taskStore.updateStatus(taskId, "failed", {
        error: message,
        completedAt: new Date().toISOString(),
      });
    }
  }

  /** Submit a task to the queue and return the initial record */
  async submitTask(input: TaskInput): Promise<TaskRecord> {
    return taskStore.create(input);
  }
}

export const taskWorker = new TaskWorker();
