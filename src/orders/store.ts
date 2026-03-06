import { randomUUID } from "node:crypto";
import type { CreateOrderInput, OrderArtifact, OrderRecord } from "./types";

class OrderStore {
  private orders = new Map<string, OrderRecord>();

  create(
    input: CreateOrderInput,
    priceLabel: string,
    nevermined?: { agentId: string; planId: string; paymentRail: "crypto" | "fiat" }
  ): OrderRecord {
    const now = new Date().toISOString();
    const order: OrderRecord = {
      ...input,
      id: randomUUID(),
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
}

export const orderStore = new OrderStore();
