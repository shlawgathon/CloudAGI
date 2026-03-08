import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { ModalClient } from "modal";
import { config } from "../../config";
import { validateCommand } from "../../utils/command";

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
  const timeoutSecs = (body.timeoutSecs as number) || config.modal.timeoutSecs;

  const APPROVED_IMAGE_PREFIXES = ["python:", "pytorch/pytorch:", "nvidia/cuda:", "nvcr.io/"];
  const resolvedImage = (body.image as string) || config.modal.image || "python:3.11-slim";
  if (!APPROVED_IMAGE_PREFIXES.some((prefix) => resolvedImage.startsWith(prefix))) {
    return {
      success: false,
      error: `Image not allowed: ${resolvedImage}. Approved prefixes: ${APPROVED_IMAGE_PREFIXES.join(", ")}`,
    };
  }

  try {
    validateCommand(command);
    const client = getModalClient();
    const app = await client.apps.fromName(config.modal.appName, {
      environment: config.modal.environmentName,
      createIfMissing: true,
    });
    const img = await client.images.fromRegistry(resolvedImage);
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
          image: resolvedImage,
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
    "CloudAGI GPU Compute — the fastest way to run ML workloads in the cloud. Execute Python, shell scripts, and inference jobs on T4, A10G, A100, or H100 GPUs via Modal serverless sandboxes. No setup, no provisioning — just send your code and get results. Ideal for model inference, batch processing, benchmarking, and scientific computing. Pay only for what you use.",
  category: "compute",
  priceLabel: "1 USDC",
  priceAmount: "1",
  priceCurrency: "USDC",
  tags: ["gpu", "compute", "cloud", "cloudagi", "modal", "ml", "inference", "serverless", "cuda", "api", "agent", "marketplace"],
  handler,
});
