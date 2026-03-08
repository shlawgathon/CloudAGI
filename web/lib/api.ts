import type { Artifact, CreateOrderResponse, Order } from "./types";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function apiUrl(path: string): string {
  if (apiBase) {
    return `${apiBase}${path}`;
  }

  return `/api${path}`;
}

function withOrderToken(readToken?: string): HeadersInit | undefined {
  if (!readToken) {
    return undefined;
  }

  return {
    "x-order-token": readToken
  };
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
  gpuHours?: number;
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

export async function fetchOrder(orderId: string, readToken?: string): Promise<Order> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}`), {
    cache: "no-store",
    headers: withOrderToken(readToken)
  });
  const payload = await readJson<{ order: Order }>(response);
  return payload.order;
}

/** Client-side fetch (no Next.js server cache) for polling */
export async function fetchOrderClient(orderId: string, readToken?: string): Promise<Order> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}`), {
    headers: withOrderToken(readToken)
  });
  const payload = await readJson<{ order: Order }>(response);
  return payload.order;
}

export async function fetchLogs(orderId: string, readToken?: string): Promise<string> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/logs`), {
    cache: "no-store",
    headers: withOrderToken(readToken)
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

/** Client-side logs fetch for polling */
export async function fetchLogsClient(orderId: string, readToken?: string): Promise<string> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/logs`), {
    headers: withOrderToken(readToken)
  });
  if (!response.ok) return "";
  return response.text();
}

export async function fetchArtifacts(orderId: string, readToken?: string): Promise<Artifact[]> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/artifacts`), {
    cache: "no-store",
    headers: withOrderToken(readToken)
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { artifacts: Artifact[] };
  return payload.artifacts;
}

/** Client-side artifacts fetch for polling */
export async function fetchArtifactsClient(orderId: string, readToken?: string): Promise<Artifact[]> {
  const response = await fetch(apiUrl(`/v1/orders/${orderId}/artifacts`), {
    headers: withOrderToken(readToken)
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { artifacts: Artifact[] };
  return payload.artifacts;
}

export function artifactDownloadUrl(orderId: string, name: string, readToken?: string): string {
  const baseUrl = apiUrl(`/v1/orders/${orderId}/artifacts/${encodeURIComponent(name)}`);
  if (!readToken) {
    return baseUrl;
  }

  if (/^https?:\/\//.test(baseUrl)) {
    const url = new URL(baseUrl);
    url.searchParams.set("token", readToken);
    return url.toString();
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}token=${encodeURIComponent(readToken)}`;
}
