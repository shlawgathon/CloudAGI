import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const query = body.query as string | undefined;
  if (!query?.trim()) {
    return { success: false, error: "query is required" };
  }

  if (!config.exa.apiKey) {
    return { success: false, error: "Exa API key not configured" };
  }

  const numResults = (body.numResults as number) || 5;
  const type = (body.type as string) || "auto";
  const useAutoprompt = body.useAutoprompt !== false;
  const contents = body.contents ?? { text: true, highlights: true };

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
        type,
        useAutoprompt,
        contents,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Exa API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

registerService({
  id: "ai-research",
  name: "AI Research",
  description:
    "Neural search powered by Exa. Find relevant web content, papers, and documentation using natural language queries. Returns full text, highlights, and metadata.",
  category: "research",
  priceLabel: "0.10 USDC",
  priceAmount: "0.10",
  priceCurrency: "USDC",
  tags: ["search", "research", "exa", "neural-search", "web", "papers"],
  handler,
});
