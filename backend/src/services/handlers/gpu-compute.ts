import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { ModalClient } from "modal";
import { config } from "../../config";

let modalClient: ModalClient | null = null;

function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }
  return modalClient;
}

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const command = body.command as string[] | undefined;
  if (!command || !Array.isArray(command) || command.length === 0) {
    return { success: false, error: "command must be a non-empty string array" };
  }

  const gpu = (body.gpu as string) || config.modal.gpu;
  const image = (body.image as string) || config.modal.image;
  const timeoutSecs = (body.timeoutSecs as number) || config.modal.timeoutSecs;

  try {
    const client = getModalClient();
    const app = await client.apps.fromName(config.modal.appName, {
      environment: config.modal.environmentName,
      createIfMissing: true,
    });
    const img = await client.images.fromRegistry(image);
    const sandbox = await client.sandboxes.create(app, img, {
      timeoutMs: timeoutSecs * 1000,
      gpu: gpu === "none" ? undefined : gpu,
    });

    try {
      const proc = await sandbox.exec(command, {
        timeoutMs: timeoutSecs * 1000,
      });
      const stdout = await proc.stdout.readText();
      const stderr = await proc.stderr.readText();
      const exitCode = await proc.wait();

      return {
        success: exitCode === 0,
        data: {
          exitCode,
          stdout,
          stderr,
          sandboxId: sandbox.sandboxId,
          gpu,
          image,
        },
      };
    } finally {
      await sandbox.terminate();
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

registerService({
  id: "gpu-compute",
  name: "GPU Compute",
  description:
    "Run arbitrary commands in a Modal serverless sandbox with optional GPU. Supports Python, shell scripts, and ML workloads with T4, A10G, A100, or H100 GPUs.",
  category: "compute",
  priceLabel: "1 USDC",
  priceAmount: "1",
  priceCurrency: "USDC",
  tags: ["gpu", "compute", "modal", "sandbox", "ml", "inference"],
  handler,
});
