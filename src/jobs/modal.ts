import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ModalClient } from "modal";
import { config } from "../config";

export interface RunJobInput {
  orderId: string;
  command: string[];
}

export interface RunJobResult {
  sandboxId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  artifactPath?: string;
  artifactSizeBytes?: number;
}

let modalClient: ModalClient | null = null;

function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }

  return modalClient;
}

export async function runJobOnModal(input: RunJobInput): Promise<RunJobResult> {
  const client = getModalClient();
  const app = await client.apps.fromName(config.modal.appName, {
    environment: config.modal.environmentName,
    createIfMissing: true
  });
  const image = await client.images.fromRegistry(config.modal.image);
  const sandbox = await client.sandboxes.create(app, image, {
    timeoutMs: config.modal.timeoutSecs * 1000,
    gpu: config.modal.gpu === "none" ? undefined : config.modal.gpu
  });

  try {
    const process = await sandbox.exec(input.command, {
      timeoutMs: config.modal.timeoutSecs * 1000
    });
    const stdout = await process.stdout.readText();
    const stderr = await process.stderr.readText();
    const artifactPath = resolve("data", "artifacts", `${input.orderId}.txt`);

    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      `# Command\n${input.command.join(" ")}\n\n# Stdout\n${stdout}\n\n# Stderr\n${stderr}\n`
    );

    const artifactStats = await stat(artifactPath);

    return {
      sandboxId: sandbox.sandboxId,
      stdout,
      stderr,
      exitCode: await process.wait(),
      artifactPath,
      artifactSizeBytes: artifactStats.size
    };
  } finally {
    await sandbox.terminate();
  }
}
