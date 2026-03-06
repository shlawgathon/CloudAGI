import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const url = body.url as string | undefined;
  const actorId = body.actorId as string | undefined;

  if (!config.apify.apiToken) {
    return { success: false, error: "Apify API token not configured" };
  }

  if (!url && !actorId) {
    return { success: false, error: "url or actorId is required" };
  }

  try {
    const actor = actorId || "apify/website-content-crawler";
    const input = actorId
      ? (body.input as Record<string, unknown>) || {}
      : {
          startUrls: [{ url }],
          maxPagesPerCrawl: (body.maxPages as number) || 1,
          crawlerType: (body.crawlerType as string) || "cheerio",
        };

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${config.apify.apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      return { success: false, error: `Apify error ${runResponse.status}: ${errText}` };
    }

    const data = await runResponse.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

registerService({
  id: "web-scraper",
  name: "Web Scraper",
  description:
    "CloudAGI Web Scraper — extract structured data from any website. Powered by Apify's 24,000+ cloud scrapers, this service handles JavaScript-rendered pages, pagination, and anti-bot protection. Returns clean, structured JSON from any URL. Use for price monitoring, lead generation, content aggregation, and market research.",
  category: "data",
  priceLabel: "0.20 USDC",
  priceAmount: "0.20",
  priceCurrency: "USDC",
  tags: ["scraping", "cloud", "cloudagi", "apify", "web", "data", "extraction", "api", "agent", "marketplace"],
  handler,
});
