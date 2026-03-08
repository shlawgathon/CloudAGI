import { randomUUID } from "node:crypto";
import type {
  AgentRole,
  CreateOrderInput,
  OrderAgentExecution,
  OrderArtifact,
  OrderOrchestration,
  OrderRecord,
  OrchestrationStatus
} from "./types";

class OrderStore {
  private orders = new Map<string, OrderRecord>();

  private removeUndefined<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
    ) as Partial<T>;
  }

  create(
    input: CreateOrderInput,
    priceLabel: string,
    nevermined?: {
      agentId: string;
      planId: string;
      paymentRail: "crypto" | "fiat";
      settlementEndpoint?: string;
      settlementMethod?: "POST" | "GET";
    }
  ): OrderRecord {
    const now = new Date().toISOString();
    const order: OrderRecord = {
      ...input,
      id: randomUUID(),
      readToken: randomUUID(),
      priceLabel,
      status: "awaiting_payment",
      createdAt: now,
      updatedAt: now,
      logs: "",
      artifacts: [],
      nevermined
    };

    this.orders.set(order.id, order);
    return order;
  }

  get(orderId: string): OrderRecord | undefined {
    return this.orders.get(orderId);
  }

  list(): OrderRecord[] {
    return [...this.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(orderId: string, patch: Partial<OrderRecord>): OrderRecord {
    const current = this.orders.get(orderId);
    if (!current) {
      throw new Error(`Order ${orderId} not found`);
    }

    const next: OrderRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.orders.set(orderId, next);
    return next;
  }

  appendLogs(orderId: string, chunk: string): OrderRecord {
    const current = this.get(orderId);
    if (!current) {
      throw new Error(`Order ${orderId} not found`);
    }

    return this.update(orderId, { logs: current.logs + chunk });
  }

  addArtifact(orderId: string, artifact: OrderArtifact): OrderRecord {
    const current = this.get(orderId);
    if (!current) {
      throw new Error(`Order ${orderId} not found`);
    }

    return this.update(orderId, { artifacts: [...current.artifacts, artifact] });
  }

  beginOrchestration(
    orderId: string,
    orchestration: Omit<OrderOrchestration, "agents"> & { agents?: OrderAgentExecution[] }
  ): OrderRecord {
    const current = this.get(orderId);
    if (!current) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (current.orchestration?.runId) {
      return current;
    }

    return this.update(orderId, {
      status: "orchestrating",
      startedAt: new Date().toISOString(),
      orchestration: {
        ...orchestration,
        agents: orchestration.agents ?? []
      }
    });
  }

  getAgentExecution(orderId: string, stepId: string): OrderAgentExecution | undefined {
    return this.get(orderId)?.orchestration?.agents.find((agent) => agent.stepId === stepId);
  }

  upsertAgentExecution(orderId: string, execution: OrderAgentExecution): OrderRecord {
    const current = this.get(orderId);
    if (!current?.orchestration) {
      throw new Error(`Order ${orderId} orchestration not found`);
    }

    const existingIndex = current.orchestration.agents.findIndex(
      (agent) => agent.stepId === execution.stepId
    );
    const agents = [...current.orchestration.agents];

    if (existingIndex >= 0) {
      agents[existingIndex] = {
        ...agents[existingIndex],
        ...execution,
        artifactNames: execution.artifactNames
      };
    } else {
      agents.push(execution);
    }

    return this.update(orderId, {
      orchestration: {
        ...current.orchestration,
        agents
      }
    });
  }

  patchAgentExecution(
    orderId: string,
    stepId: string,
    patch: Partial<OrderAgentExecution> & { role?: AgentRole }
  ): OrderRecord {
    const current = this.get(orderId);
    if (!current?.orchestration) {
      throw new Error(`Order ${orderId} orchestration not found`);
    }

    const existing = current.orchestration.agents.find((agent) => agent.stepId === stepId);
    if (!existing) {
      throw new Error(`Order ${orderId} step ${stepId} not found`);
    }

    const sanitizedPatch = this.removeUndefined(patch);
    const agents = current.orchestration.agents.map((agent) =>
      agent.stepId === stepId
        ? {
            ...agent,
            ...sanitizedPatch,
            artifactNames: sanitizedPatch.artifactNames ?? agent.artifactNames
          }
        : agent
    );

    return this.update(orderId, {
      orchestration: {
        ...current.orchestration,
        agents
      }
    });
  }

  setOrchestrationStatus(
    orderId: string,
    status: OrchestrationStatus,
    extra?: Partial<OrderOrchestration>
  ): OrderRecord {
    const current = this.get(orderId);
    if (!current?.orchestration) {
      throw new Error(`Order ${orderId} orchestration not found`);
    }

    return this.update(orderId, {
      status:
        status === "succeeded"
          ? "succeeded"
          : status === "failed"
            ? "failed"
            : status === "canceled"
              ? "canceled"
              : "orchestrating",
      completedAt:
        status === "succeeded" || status === "failed" || status === "canceled"
          ? new Date().toISOString()
          : current.completedAt,
      failedAt: status === "failed" ? new Date().toISOString() : current.failedAt,
      orchestration: {
        ...current.orchestration,
        ...extra,
        status,
        completedAt:
          status === "succeeded" || status === "failed" || status === "canceled"
            ? new Date().toISOString()
            : current.orchestration.completedAt
      }
    });
  }
  stashAccessToken(orderId: string, token: string): OrderRecord {
    return this.update(orderId, { accessToken: token });
  }

  updateCompute(orderId: string, stepDurationMs: number, stepCreditsUsed: number): OrderRecord {
    const current = this.get(orderId);
    if (!current) {
      throw new Error(`Order ${orderId} not found`);
    }

    const compute = current.compute || {
      totalDurationMs: 0,
      totalCreditsUsed: 0,
      gpuHoursRequested: current.gpuHours || 1
    };

    return this.update(orderId, {
      compute: {
        ...compute,
        totalDurationMs: compute.totalDurationMs + stepDurationMs,
        totalCreditsUsed: compute.totalCreditsUsed + stepCreditsUsed
      }
    });
  }
}

export const orderStore = new OrderStore();
