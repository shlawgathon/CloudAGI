import { basename } from "node:path";
import { orderStore } from "../orders/store";
import { runJobOnModal } from "./modal";

export async function startOrderJob(orderId: string): Promise<void> {
  const order = orderStore.get(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.status === "running") {
    return;
  }

  orderStore.update(orderId, {
    status: "running",
    startedAt: new Date().toISOString(),
    logs: `${order.logs}\n[${new Date().toISOString()}] Starting Modal job...\n`
  });

  try {
    const result = await runJobOnModal({
      orderId,
      command: order.command
    });

    const logParts = [
      `[${new Date().toISOString()}] Sandbox: ${result.sandboxId}`,
      "",
      "# stdout",
      result.stdout,
      "",
      "# stderr",
      result.stderr
    ].join("\n");

    orderStore.update(orderId, {
      status: result.exitCode === 0 ? "succeeded" : "failed",
      completedAt: new Date().toISOString(),
      modalSandboxId: result.sandboxId,
      modalReturnCode: result.exitCode,
      logs: `${orderStore.get(orderId)?.logs ?? ""}${logParts}\n`
    });

    if (result.artifactPath && result.artifactSizeBytes !== undefined) {
      orderStore.addArtifact(orderId, {
        name: basename(result.artifactPath),
        path: result.artifactPath,
        contentType: "text/plain; charset=utf-8",
        sizeBytes: result.artifactSizeBytes
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    orderStore.update(orderId, {
      status: "failed",
      failedAt: new Date().toISOString(),
      logs: `${orderStore.get(orderId)?.logs ?? ""}\n[${new Date().toISOString()}] ${message}\n`
    });
    throw error;
  }
}
