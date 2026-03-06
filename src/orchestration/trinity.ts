import { config } from "../config";
import type { OrderRecord } from "../orders/types";

const TRIGGER_PATH = "/api/cloudagi/order-runs";

function trinityHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.trinity.apiKey}`
  };
}

export interface TrinityOrderRunTrigger {
  order: OrderRecord;
  callbacks: {
    executeStepUrl: string;
    stepCallbackUrl: string;
    finalizeRunUrl: string;
  };
  sharedSecret: string;
  systemName: string;
  orchestratorAgent: string;
}

export interface TrinityOrderRunResponse {
  runId: string;
  status: string;
}

export function isTrinityConfigured(): boolean {
  return Boolean(
    config.trinity.baseUrl &&
      config.trinity.apiKey &&
      config.trinity.systemName &&
      config.trinity.orchestratorAgent &&
      config.trinity.sharedSecret
  );
}

function requireTrinityConfigured(): void {
  if (!isTrinityConfigured()) {
    throw new Error(
      "Trinity is not configured. Set TRINITY_BASE_URL, TRINITY_API_KEY, TRINITY_SYSTEM_NAME, TRINITY_ORCHESTRATOR_AGENT, and TRINITY_SHARED_SECRET."
    );
  }
}

function getRunUrl(runId: string): string {
  return `${config.trinity.baseUrl}${TRIGGER_PATH}/${runId}`;
}

export class TrinityClient {
  async triggerOrderRun(payload: TrinityOrderRunTrigger): Promise<TrinityOrderRunResponse> {
    requireTrinityConfigured();

    const response = await fetch(`${config.trinity.baseUrl}${TRIGGER_PATH}`, {
      method: "POST",
      headers: trinityHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Trinity trigger failed with ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as {
      runId?: string;
      id?: string;
      status?: string;
    };

    const runId = body.runId || body.id;
    if (!runId) {
      throw new Error("Trinity trigger response did not include a runId");
    }

    return {
      runId,
      status: body.status || "triggered"
    };
  }

  async getRunStatus(runId: string): Promise<{ runId: string; status: string }> {
    requireTrinityConfigured();

    const response = await fetch(getRunUrl(runId), {
      method: "GET",
      headers: trinityHeaders()
    });

    if (!response.ok) {
      throw new Error(`Trinity status failed with ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as { runId?: string; id?: string; status?: string };

    return {
      runId: body.runId || body.id || runId,
      status: body.status || "unknown"
    };
  }

  async cancelRun(runId: string): Promise<void> {
    requireTrinityConfigured();

    const response = await fetch(`${getRunUrl(runId)}/cancel`, {
      method: "POST",
      headers: trinityHeaders()
    });

    if (!response.ok) {
      throw new Error(`Trinity cancel failed with ${response.status}: ${await response.text()}`);
    }
  }
}

export const trinityClient = new TrinityClient();
