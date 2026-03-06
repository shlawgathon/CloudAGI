import { config } from "../config";

const DISCOVERY_BASE = "https://one-backend.nevermined.app/api/v1/agents";

interface DiscoveredAgent {
  agentId: string;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  planId?: string;
  priceLabel?: string;
}

interface DiscoveryCache {
  data: DiscoveredAgent[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let sellersCache: DiscoveryCache | null = null;

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(config.nevermined.apiKey
      ? { Authorization: `Bearer ${config.nevermined.apiKey}` }
      : {}),
  };
}

export async function discoverSellers(
  category?: string
): Promise<DiscoveredAgent[]> {
  const now = Date.now();
  if (sellersCache && now - sellersCache.timestamp < CACHE_TTL_MS) {
    const cached = sellersCache.data;
    return category
      ? cached.filter((a) => a.category === category)
      : cached;
  }

  try {
    const url = new URL(DISCOVERY_BASE);
    if (category) url.searchParams.set("category", category);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error(`Discovery API error: ${response.status}`);
      return sellersCache?.data || [];
    }

    const body = (await response.json()) as {
      agents?: DiscoveredAgent[];
      data?: DiscoveredAgent[];
    };

    const agents = body.agents || body.data || [];
    sellersCache = { data: agents, timestamp: now };
    return category
      ? agents.filter((a) => a.category === category)
      : agents;
  } catch (error) {
    console.error("Discovery API fetch failed:", error);
    return sellersCache?.data || [];
  }
}

export async function discoverBuyers(): Promise<DiscoveredAgent[]> {
  try {
    const url = new URL(`${DISCOVERY_BASE}/buyers`);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) return [];

    const body = (await response.json()) as {
      agents?: DiscoveredAgent[];
      data?: DiscoveredAgent[];
    };

    return body.agents || body.data || [];
  } catch {
    return [];
  }
}
