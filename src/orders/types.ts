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

export type OrchestrationStatus =
  | "pending"
  | "triggered"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "canceled";

export interface CreateOrderInput {
  customerName: string;
  contact: string;
  jobType: JobType;
  repoUrl?: string;
  command: string[];
  inputNotes: string;
  expectedOutput: string;
}

export interface OrderArtifact {
  name: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  agentRole?: AgentRole;
  stepId?: string;
}

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
}

export interface OrderOrchestration {
  provider: "trinity";
  systemName: string;
  orchestratorAgent: string;
  runId?: string;
  status: OrchestrationStatus;
  startedAt?: string;
  completedAt?: string;
  finalizedAt?: string;
  triggerCompleted?: boolean;
  triggerPayload?: {
    orderId: string;
    callbackBaseUrl: string;
  };
  agents: OrderAgentExecution[];
}

export interface OrderRecord extends CreateOrderInput {
  id: string;
  priceLabel: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  logs: string;
  artifacts: OrderArtifact[];
  nevermined?: {
    agentId: string;
    planId: string;
    paymentRail: "crypto" | "fiat";
  };
  orchestration?: OrderOrchestration;
}
