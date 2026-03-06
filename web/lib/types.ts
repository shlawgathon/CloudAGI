export type JobType = "inference" | "eval" | "batch" | "custom";

export type OrderStatus =
  | "awaiting_payment"
  | "orchestrating"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type AgentRole = "planner" | "executor" | "reviewer" | "packager";

export type AgentExecutionStatus =
  | "pending"
  | "requested"
  | "running"
  | "succeeded"
  | "failed";

export interface OrderAgentExecution {
  role: AgentRole;
  stepId: string;
  status: AgentExecutionStatus;
  gpu: string;
  command: string[];
  modalSandboxId?: string;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number | null;
  artifactNames: string[];
  stdout?: string;
  stderr?: string;
  callbackStatus?: "pending" | "received";
  durationMs?: number;
  creditsUsed?: number;
}

export interface OrderOrchestration {
  provider: "trinity";
  systemName: string;
  orchestratorAgent: string;
  runId?: string;
  status: "pending" | "triggered" | "in_progress" | "succeeded" | "failed" | "canceled";
  startedAt?: string;
  completedAt?: string;
  finalizedAt?: string;
  agents: OrderAgentExecution[];
}

export interface ComputeSummary {
  totalDurationMs: number;
  totalCreditsUsed: number;
  gpuHoursRequested: number;
}

export interface Order {
  id: string;
  customerName: string;
  contact: string;
  jobType: JobType;
  repoUrl?: string;
  command: string[];
  inputNotes: string;
  expectedOutput: string;
  gpuHours?: number;
  priceLabel: string;
  status: OrderStatus;
  logs: string;
  artifacts: Artifact[];
  nevermined?: {
    agentId: string;
    planId: string;
    paymentRail: "crypto" | "fiat";
  };
  orchestration?: OrderOrchestration;
  compute?: ComputeSummary;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

export interface Artifact {
  name: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  agentRole?: AgentRole;
  stepId?: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment:
    | {
        type: "nevermined-x402";
        agentId: string;
        planId: string;
        offerName: string;
        priceLabel: string;
        paymentRail: "crypto" | "fiat";
        instructions: string;
      }
    | {
        type: "not-configured";
        instructions: string;
      };
}
