import type { Artifact, CreateOrderResponse, Order } from "./types";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function apiUrl(path: string): string {
  if (apiBase) {
    return `${apiBase}${path}`;
  }

  return `/api${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function createOrder(payload: {
  customerName: string;
  contact: string;
  jobType: string;
  repoUrl?: string;
  command: string[];
  inputNotes: string;
  expectedOutput: string;
}): Promise<CreateOrderResponse> {
  const response = await fetch(apiUrl("/v1/orders"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<CreateOrderResponse>(response);
}

export async function fetchOrder(orderId: string): Promise<Order> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}`), {
    cache: "no-store"
  });
  const payload = await readJson<{ order: Order }>(response);
  return payload.order;
}

export async function fetchLogs(orderId: string): Promise<string> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/logs`), {
    cache: "no-store"
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

export async function fetchArtifacts(orderId: string): Promise<Artifact[]> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/artifacts`), {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { artifacts: Artifact[] };
  return payload.artifacts;
}

export function artifactDownloadUrl(orderId: string, name: string): string {
  return apiUrl(`/v1/orders/${orderId}/artifacts/${encodeURIComponent(name)}`);
}
