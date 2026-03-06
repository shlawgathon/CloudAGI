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
  priceLabel: string;
  status: OrderStatus;
  logs: string;
  artifacts: Artifact[];
  modalSandboxId?: string;
  modalReturnCode?: number | null;
  nevermined?: {
    agentId: string;
    planId: string;
    paymentRail: "crypto" | "fiat";
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
        priceLabel: string;
        paymentRail: "crypto" | "fiat";
        instructions: string;
      }
    | {
        type: "not-configured";
        instructions: string;
      };
}
