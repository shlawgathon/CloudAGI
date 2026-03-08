export type JobType = "inference" | "eval" | "batch" | "custom";

export type OrderStatus =
  | "awaiting_payment"
  | "orchestrating"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type AgentRole =
  | "gpu-compute"
  | "ai-research"
  | "web-scraper"
  | "code-review"
  | "smart-search"
  | "coding-task";

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
  gpuHours?: number;
}

export interface CreateAgentOrderInput {
  agentName?: string;
  agentId?: string;
  contact?: string;
  jobType?: JobType;
  repoUrl?: string;
  command?: string[] | string;
  objective?: string;
  inputNotes?: string;
  expectedOutput?: string;
  gpuHours?: number;
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
  durationMs?: number;
  creditsUsed?: number;
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

export interface ComputeSummary {
  totalDurationMs: number;
  totalCreditsUsed: number;
  gpuHoursRequested: number;
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
    settlementEndpoint?: string;
    settlementMethod?: "POST" | "GET";
  };
  orchestration?: OrderOrchestration;
  compute?: ComputeSummary;
  accessToken?: string;
}
