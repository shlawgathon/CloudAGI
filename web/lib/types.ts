export type JobType = "inference" | "eval" | "batch" | "custom";

export type OrderStatus =
  | "awaiting_payment"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface Order {
  id: string;
  customerName: string;
  contact: string;
  jobType: JobType;
  repoUrl?: string;
  command: string[];
  inputNotes: string;
  expectedOutput: string;
  priceUsdc: string;
  status: OrderStatus;
  logs: string;
  artifacts: Artifact[];
  modalSandboxId?: string;
  modalReturnCode?: number | null;
  nevermined?: {
    agentId: string;
    planId: string;
  };
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
}

export interface CreateOrderResponse {
  order: Order;
  payment:
    | {
        type: "nevermined-x402";
        agentId: string;
        planId: string;
        offerName: string;
        priceUsdc: string;
        instructions: string;
      }
    | {
        type: "not-configured";
        instructions: string;
      };
}
