export type JobType = "inference" | "eval" | "batch" | "custom";

export type OrderStatus =
  | "awaiting_payment"
  | "running"
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
  modalSandboxId?: string;
  modalReturnCode?: number | null;
  nevermined?: {
    agentId: string;
    planId: string;
    paymentRail: "crypto" | "fiat";
  };
}
