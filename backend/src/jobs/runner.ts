import { orderStore } from "../orders/store";
import type { AgentRole, OrderAgentExecution, OrderRecord } from "../orders/types";
import { runAgentStepOnModal } from "./modal";
import { trinityClient } from "../orchestration/trinity";
import { config } from "../config";

export interface TrinityExecuteStepInput {
  orderId: string;
  runId: string;
  stepId: string;
  role: AgentRole;
}

export interface TrinityStepCallbackInput {
  orderId: string;
  runId: string;
  stepId: string;
  role: AgentRole;
  status: "succeeded" | "failed";
  message?: string;
}

export interface TrinityFinalizeRunInput {
  orderId: string;
  runId: string;
  status: "succeeded" | "failed" | "canceled";
}

function getCallbackUrls(baseUrl: string) {
  return {
    executeStepUrl: `${baseUrl}/internal/trinity/execute-step`,
    stepCallbackUrl: `${baseUrl}/internal/trinity/step-callback`,
    finalizeRunUrl: `${baseUrl}/internal/trinity/finalize-run`
  };
}

function appendOrderLog(orderId: string, message: string): void {
  orderStore.appendLogs(orderId, `[${new Date().toISOString()}] ${message}\n`);
}

function buildInitialExecution(order: OrderRecord, input: TrinityExecuteStepInput): OrderAgentExecution {
  const gpu = input.role === "executor" ? config.modal.gpu : "none";
  const command =
    input.role === "executor"
      ? order.command
      : ["python", "-c", `${input.role} wrapper for ${input.orderId} / ${input.stepId}`];

  return {
    role: input.role,
    stepId: input.stepId,
    status: "requested",
    gpu,
    command,
    artifactNames: [],
    callbackStatus: "pending"
  };
}

export async function startOrderJob(orderId: string, callbackBaseUrl: string): Promise<OrderRecord> {
  const order = orderStore.get(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.orchestration?.runId) {
    return order;
  }

  orderStore.beginOrchestration(orderId, {
    provider: "trinity",
    systemName: config.trinity.systemName,
    orchestratorAgent: config.trinity.orchestratorAgent,
    status: "pending",
    startedAt: new Date().toISOString(),
    triggerPayload: {
      orderId,
      callbackBaseUrl
    }
  });
  appendOrderLog(orderId, "Starting Trinity orchestration run...");

  try {
    const response = await trinityClient.triggerOrderRun({
      order: orderStore.get(orderId) as OrderRecord,
      callbacks: getCallbackUrls(callbackBaseUrl),
      sharedSecret: config.trinity.sharedSecret,
      systemName: config.trinity.systemName,
      orchestratorAgent: config.trinity.orchestratorAgent
    });

    const next = orderStore.setOrchestrationStatus(orderId, "triggered", {
      runId: response.runId,
      startedAt: new Date().toISOString(),
      triggerCompleted: true
    });
    appendOrderLog(orderId, `Trinity run triggered: ${response.runId}`);
    return next;
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    appendOrderLog(orderId, `Trinity trigger failed: ${message}`);
    orderStore.setOrchestrationStatus(orderId, "failed");
    throw error;
  }
}

export async function executeTrinityStep(input: TrinityExecuteStepInput) {
  const order = orderStore.get(input.orderId);
  if (!order?.orchestration) {
    throw new Error(`Order ${input.orderId} orchestration not found`);
  }

  if (order.orchestration.runId && order.orchestration.runId !== input.runId) {
    throw new Error(`Run mismatch for order ${input.orderId}`);
  }

  const existing = orderStore.getAgentExecution(input.orderId, input.stepId);
  if (existing && (existing.status === "running" || existing.status === "succeeded")) {
    return existing;
  }

  if (!existing) {
    orderStore.upsertAgentExecution(input.orderId, buildInitialExecution(order, input));
  }

  orderStore.patchAgentExecution(input.orderId, input.stepId, {
    status: "running",
    startedAt: new Date().toISOString()
  });
  orderStore.setOrchestrationStatus(input.orderId, "in_progress");
  appendOrderLog(input.orderId, `Executing ${input.role} step ${input.stepId} in Modal...`);

  try {
    const result = await runAgentStepOnModal({
      order: orderStore.get(input.orderId) as OrderRecord,
      role: input.role,
      stepId: input.stepId
    });

    orderStore.addArtifact(input.orderId, result.artifact);
    const updated = orderStore.patchAgentExecution(input.orderId, input.stepId, {
      status: result.exitCode === 0 ? "succeeded" : "failed",
      command: result.command,
      gpu: result.gpu,
      modalSandboxId: result.sandboxId,
      completedAt: new Date().toISOString(),
      exitCode: result.exitCode,
      artifactNames: [result.artifact.name],
      stdout: result.stdout,
      stderr: result.stderr
    });

    appendOrderLog(
      input.orderId,
      [
        `${input.role} completed in sandbox ${result.sandboxId}`,
        "# stdout",
        result.stdout,
        "",
        "# stderr",
        result.stderr
      ].join("\n")
    );

    if (result.exitCode !== 0) {
      orderStore.setOrchestrationStatus(input.orderId, "failed");
    }

    return updated.orchestration?.agents.find((agent) => agent.stepId === input.stepId);
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    orderStore.patchAgentExecution(input.orderId, input.stepId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      stderr: message
    });
    orderStore.setOrchestrationStatus(input.orderId, "failed");
    appendOrderLog(input.orderId, `${input.role} failed: ${message}`);
    throw error;
  }
}

export function recordTrinityStepCallback(input: TrinityStepCallbackInput): OrderRecord {
  const order = orderStore.get(input.orderId);
  if (!order?.orchestration) {
    throw new Error(`Order ${input.orderId} orchestration not found`);
  }

  if (order.orchestration.runId && order.orchestration.runId !== input.runId) {
    throw new Error(`Run mismatch for order ${input.orderId}`);
  }

  if (!orderStore.getAgentExecution(input.orderId, input.stepId)) {
    orderStore.upsertAgentExecution(
      input.orderId,
      buildInitialExecution(order, {
        orderId: input.orderId,
        runId: input.runId,
        stepId: input.stepId,
        role: input.role
      })
    );
  }

  appendOrderLog(
    input.orderId,
    `Trinity callback recorded for ${input.role} (${input.stepId}): ${input.status}${input.message ? ` - ${input.message}` : ""}`
  );

  const next = orderStore.patchAgentExecution(input.orderId, input.stepId, {
    callbackStatus: "received",
    status: input.status === "failed" ? "failed" : undefined
  });

  if (input.status === "failed") {
    return orderStore.setOrchestrationStatus(input.orderId, "failed");
  }

  return next;
}

export function finalizeTrinityRun(input: TrinityFinalizeRunInput): OrderRecord {
  const order = orderStore.get(input.orderId);
  if (!order?.orchestration) {
    throw new Error(`Order ${input.orderId} orchestration not found`);
  }

  if (order.orchestration.runId && order.orchestration.runId !== input.runId) {
    throw new Error(`Run mismatch for order ${input.orderId}`);
  }

  const hasFailures = order.orchestration.agents.some((agent) => agent.status === "failed");
  const finalStatus = hasFailures ? "failed" : input.status;

  appendOrderLog(input.orderId, `Trinity finalized run ${input.runId} with status ${finalStatus}`);
  return orderStore.setOrchestrationStatus(input.orderId, finalStatus, {
    finalizedAt: new Date().toISOString()
  });
}
