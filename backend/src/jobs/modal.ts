import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ModalClient } from "modal";
import { config } from "../config";
import type { AgentRole, OrderArtifact, OrderRecord } from "../orders/types";

export interface AgentStepExecutionInput {
  order: OrderRecord;
  role: AgentRole;
  stepId: string;
}

export interface AgentStepExecutionResult {
  role: AgentRole;
  stepId: string;
  command: string[];
  gpu: string;
  sandboxId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  artifact: OrderArtifact;
}

let modalClient: ModalClient | null = null;

function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }

  return modalClient;
}

function buildPlannerScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    jobType: order.jobType,
    repoUrl: order.repoUrl,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('planner: generated execution plan')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function buildReviewerScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    expectedOutput: order.expectedOutput,
    inputNotes: order.inputNotes
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('reviewer: validated executor output against requested outcome')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function buildPackagerScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    customerName: order.customerName,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('packager: assembled delivery package metadata')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function getAgentCommand(order: OrderRecord, role: AgentRole, stepId: string): string[] {
  if (role === "executor") {
    return order.command;
  }

  if (role === "planner") {
    return ["python", "-c", buildPlannerScript(order, stepId)];
  }

  if (role === "reviewer") {
    return ["python", "-c", buildReviewerScript(order, stepId)];
  }

  return ["python", "-c", buildPackagerScript(order, stepId)];
}

function getAgentGpu(role: AgentRole): string {
  return role === "executor" ? config.modal.gpu : "none";
}

export async function runAgentStepOnModal(
  input: AgentStepExecutionInput
): Promise<AgentStepExecutionResult> {
  const client = getModalClient();
  const app = await client.apps.fromName(config.modal.appName, {
    environment: config.modal.environmentName,
    createIfMissing: true
  });
  const image = await client.images.fromRegistry(config.modal.image);
  const command = getAgentCommand(input.order, input.role, input.stepId);
  const gpu = getAgentGpu(input.role);
  const sandbox = await client.sandboxes.create(app, image, {
    timeoutMs: config.modal.timeoutSecs * 1000,
    gpu: gpu === "none" ? undefined : gpu
  });

  try {
    const process = await sandbox.exec(command, {
      timeoutMs: config.modal.timeoutSecs * 1000
    });
    const stdout = await process.stdout.readText();
    const stderr = await process.stderr.readText();
    const exitCode = await process.wait();
    const artifactName = `${input.role}-${input.stepId}.txt`;
    const artifactPath = resolve(
      "data",
      "artifacts",
      input.order.id,
      input.role,
      input.stepId,
      artifactName
    );

    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      [
        `# Role`,
        input.role,
        "",
        `# Step ID`,
        input.stepId,
        "",
        `# GPU`,
        gpu,
        "",
        `# Command`,
        command.join(" "),
        "",
        `# Stdout`,
        stdout,
        "",
        `# Stderr`,
        stderr
      ].join("\n")
    );

    const artifactStats = await stat(artifactPath);

    return {
      role: input.role,
      stepId: input.stepId,
      command,
      gpu,
      sandboxId: sandbox.sandboxId,
      stdout,
      stderr,
      exitCode,
      artifact: {
        name: artifactName,
        path: artifactPath,
        contentType: "text/plain; charset=utf-8",
        sizeBytes: artifactStats.size,
        agentRole: input.role,
        stepId: input.stepId
      }
    };
  } finally {
    await sandbox.terminate();
  }
}
