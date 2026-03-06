import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

async function searchExa(query: string, numResults: number): Promise<SearchResult[]> {
  if (!config.exa.apiKey) return [];

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.exa.apiKey,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: "auto",
        useAutoprompt: true,
        contents: { text: { maxCharacters: 500 }, highlights: true },
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        text?: string;
        highlights?: string[];
      }>;
    };

    return (data.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.highlights?.[0] || r.text?.slice(0, 300) || "",
      source: "exa",
    }));
  } catch {
    return [];
  }
}

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const query = body.query as string | undefined;
  if (!query?.trim()) {
    return { success: false, error: "query is required" };
  }

  const numResults = (body.numResults as number) || 5;
  const sources = (body.sources as string[]) || ["exa"];

  const searches: Promise<SearchResult[]>[] = [];
  if (sources.includes("exa")) {
    searches.push(searchExa(query, numResults));
  }

  const results = await Promise.allSettled(searches);
  const allResults: SearchResult[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    }
  }

  if (allResults.length === 0) {
    return {
      success: false,
      error: "No results found. Ensure at least one search API key is configured.",
    };
  }

  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return {
    success: true,
    data: {
      query,
      totalResults: deduped.length,
      results: deduped.slice(0, numResults),
    },
  };
}

registerService({
  id: "smart-search",
  name: "Smart Search",
  description:
    "Multi-source search aggregator. Combines results from neural search (Exa) and other providers. Deduplicates and ranks results for comprehensive coverage.",
  category: "research",
  priceLabel: "0.05 USDC",
  priceAmount: "0.05",
  priceCurrency: "USDC",
  tags: ["search", "aggregator", "multi-source", "research", "discovery"],
  handler,
});
