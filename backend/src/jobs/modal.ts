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
  durationMs: number;
  artifact: OrderArtifact;
}

let modalClient: ModalClient | null = null;

function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }

  return modalClient;
}

function buildAiResearchScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    jobType: order.jobType,
    repoUrl: order.repoUrl,
    inputNotes: order.inputNotes,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('ai-research: prepared research brief')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function buildWebScraperScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    repoUrl: order.repoUrl,
    inputNotes: order.inputNotes,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('web-scraper: prepared scraping task')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function buildCodeReviewScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    repoUrl: order.repoUrl,
    inputNotes: order.inputNotes,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('code-review: prepared review scope')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function buildSmartSearchScript(order: OrderRecord, stepId: string): string {
  const payload = JSON.stringify({
    orderId: order.id,
    stepId,
    customerName: order.customerName,
    inputNotes: order.inputNotes,
    expectedOutput: order.expectedOutput
  });

  return [
    "import json",
    `payload = json.loads(${JSON.stringify(payload)})`,
    "print('smart-search: prepared search plan')",
    "print(json.dumps(payload, indent=2))"
  ].join("\n");
}

function getAgentCommand(order: OrderRecord, role: AgentRole, stepId: string): string[] {
  if (role === "gpu-compute") {
    return order.command;
  }

  if (role === "ai-research") {
    return ["python", "-c", buildAiResearchScript(order, stepId)];
  }

  if (role === "web-scraper") {
    return ["python", "-c", buildWebScraperScript(order, stepId)];
  }

  if (role === "code-review") {
    return ["python", "-c", buildCodeReviewScript(order, stepId)];
  }

  return ["python", "-c", buildSmartSearchScript(order, stepId)];
}

function getAgentGpu(role: AgentRole): string {
  return role === "gpu-compute" ? config.modal.gpu : "none";
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
    const startMs = Date.now();
    const process = await sandbox.exec(command, {
      timeoutMs: config.modal.timeoutSecs * 1000
    });
    const stdout = await process.stdout.readText();
    const stderr = await process.stderr.readText();
    const exitCode = await process.wait();
    const durationMs = Date.now() - startMs;
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
      durationMs,
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
