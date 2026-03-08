import { config } from "../../config";
import { startOrderJob } from "../../jobs/runner";
import { orderStore } from "../../orders/store";
import type { CreateOrderInput, JobType } from "../../orders/types";
import { isTrinityConfigured } from "../../orchestration/trinity";
import { getAllServices, getRegisteredService, registerService } from "../registry";
import type { ServiceExecutionContext, ServiceResult } from "../registry";
import { normalizeCommand, splitCommand } from "../../utils/command";

function controlledServices() {
  return getAllServices()
    .filter((service) => service.id !== "orchestrator")
    .map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description
    }));
}

function toOrderInput(body: Record<string, unknown>): CreateOrderInput | string {
  const agentName = typeof body.agentName === "string" ? body.agentName.trim() : "";
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const objective = typeof body.objective === "string" ? body.objective.trim() : "";
  const inputNotes =
    typeof body.inputNotes === "string" ? body.inputNotes.trim() : objective;
  const expectedOutput =
    typeof body.expectedOutput === "string" ? body.expectedOutput.trim() : "";
  const command = normalizeCommand(body.command as string[] | string | undefined);
  const jobType =
    typeof body.jobType === "string" && body.jobType
      ? (body.jobType as JobType)
      : "custom";
  const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : undefined;
  const gpuHoursRaw = body.gpuHours;
  const gpuHours =
    typeof gpuHoursRaw === "number" && Number.isFinite(gpuHoursRaw)
      ? gpuHoursRaw
      : typeof gpuHoursRaw === "string" && gpuHoursRaw.trim()
        ? Number(gpuHoursRaw)
        : undefined;

  if (!agentName && !agentId) {
    return "agentName or agentId is required";
  }

  if (!inputNotes) {
    return "inputNotes or objective is required";
  }

  if (!expectedOutput) {
    return "expectedOutput is required";
  }

  if (command.length === 0) {
    return "command must be a non-empty string or string array";
  }

  return {
    customerName: agentName || agentId,
    contact: contact || (agentId ? `agent:${agentId}` : `agent:${agentName}`),
    jobType,
    repoUrl,
    command,
    inputNotes,
    expectedOutput,
    gpuHours: gpuHours && Number.isFinite(gpuHours) ? gpuHours : 1
  };
}

async function delegateToLeaf(
  body: Record<string, unknown>,
  context: ServiceExecutionContext
): Promise<ServiceResult> {
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  if (!serviceId) {
    return { success: false, error: "serviceId is required for delegate mode" };
  }

  if (serviceId === "orchestrator") {
    return { success: false, error: "orchestrator cannot delegate to itself" };
  }

  const leafService = getRegisteredService(serviceId);
  if (!leafService) {
    return { success: false, error: `Unknown service: ${serviceId}` };
  }

  const serviceInput =
    body.serviceInput && typeof body.serviceInput === "object" && !Array.isArray(body.serviceInput)
      ? (body.serviceInput as Record<string, unknown>)
      : {};

  const result = await leafService.handler(serviceInput, {
    ...context,
    service: leafService,
    endpoint: `/v1/services/${leafService.id}/execute`
  });

  return {
    success: result.success,
    data: {
      mode: "delegate",
      delegatedTo: {
        id: leafService.id,
        name: leafService.name,
        agentId: leafService.agentId,
        planId: leafService.planId
      },
      controlledServices: controlledServices(),
      result: result.data
    },
    error: result.error
  };
}

async function orchestrate(
  body: Record<string, unknown>,
  context: ServiceExecutionContext
): Promise<ServiceResult> {
  if (!isTrinityConfigured()) {
    return {
      success: false,
      error:
        "Trinity is not configured. Set TRINITY_BASE_URL, TRINITY_API_KEY, TRINITY_SYSTEM_NAME, TRINITY_ORCHESTRATOR_AGENT, and TRINITY_SHARED_SECRET."
    };
  }

  const input = toOrderInput(body);
  if (typeof input === "string") {
    return { success: false, error: input };
  }

  const order = orderStore.create(input, context.service.priceLabel, {
    agentId: context.service.agentId,
    planId: context.service.planId,
    paymentRail: config.nevermined.paymentRail,
    settlementEndpoint: context.endpoint,
    settlementMethod: "POST"
  });

  if (context.accessToken) {
    orderStore.stashAccessToken(order.id, context.accessToken);
  }

  orderStore.update(order.id, {
    compute: {
      totalDurationMs: 0,
      totalCreditsUsed: 0,
      gpuHoursRequested: input.gpuHours || 1
    }
  });

  const nextOrder = await startOrderJob(order.id, context.baseUrl);

  return {
    success: true,
    data: {
      mode: "orchestrate",
      branchAgent: {
        id: context.service.id,
        name: context.service.name,
        agentId: context.service.agentId,
        planId: context.service.planId
      },
      trinity: {
        systemName: config.trinity.systemName,
        orchestratorAgent: config.trinity.orchestratorAgent
      },
      controlledServices: controlledServices(),
      orderId: nextOrder.id,
      order: nextOrder,
      links: {
        order: `${context.baseUrl}/v1/orders/${nextOrder.id}`,
        logs: `${context.baseUrl}/v1/orders/${nextOrder.id}/logs`,
        artifacts: `${context.baseUrl}/v1/orders/${nextOrder.id}/artifacts`
      }
    }
  };
}

async function handler(
  body: Record<string, unknown>,
  context: ServiceExecutionContext
): Promise<ServiceResult> {
  const mode = typeof body.mode === "string" ? body.mode.trim() : "";
  if (mode === "delegate" || typeof body.serviceId === "string") {
    return delegateToLeaf(body, context);
  }

  return orchestrate(body, context);
}

registerService({
  id: "orchestrator",
  name: "Branch Orchestrator",
  description:
    "Central CloudAGI branch agent on Nevermined. It controls the five leaf marketplace agents, can delegate directly to any leaf service, and can launch a Trinity-managed multi-agent run for larger work.",
  category: "orchestration",
  priceLabel: config.offerPriceLabel,
  priceAmount: config.offerPriceAmount,
  priceCurrency: config.paymentCurrency,
  tags: [
    "orchestrator",
    "branch-agent",
    "multi-agent",
    "trinity",
    "nevermined",
    "cloudagi",
    "routing",
    "delegation"
  ],
  handler
});
