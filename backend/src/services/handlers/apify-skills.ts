import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

// ---------------------------------------------------------------------------
// Apify API helpers
// ---------------------------------------------------------------------------

const APIFY_BASE = "https://api.apify.com/v2";
const RUN_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "ABORTING"
  | "ABORTED"
  | "TIMED-OUT";

interface ApifyRun {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
}

/** Start an Apify actor run and return the run metadata. */
async function startRun(
  actorId: string,
  input: Record<string, unknown>
): Promise<ApifyRun> {
  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apify.apiToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify start-run error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.data as ApifyRun;
}

/** Poll an Apify run until it reaches a terminal state or we time out. */
async function waitForRun(runId: string): Promise<ApifyRun> {
  const deadline = Date.now() + RUN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${config.apify.apiToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify poll error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const run = json.data as ApifyRun;

    if (run.status === "SUCCEEDED") return run;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
      throw new Error(`Apify run ended with status: ${run.status}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Apify run timed out after 60 seconds");
}

/** Fetch dataset items from a completed run. */
async function getDatasetItems(
  datasetId: string,
  limit = 100
): Promise<unknown[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${limit}`,
    { headers: { Authorization: `Bearer ${config.apify.apiToken}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify dataset error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Run an Apify actor end-to-end and return the dataset items. */
async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  maxItems = 100
): Promise<unknown[]> {
  const run = await startRun(actorId, input);
  const completed = await waitForRun(run.id);
  return getDatasetItems(completed.defaultDatasetId, maxItems);
}

// ---------------------------------------------------------------------------
// Skill implementations
// ---------------------------------------------------------------------------

type SkillFn = (body: Record<string, unknown>) => Promise<ServiceResult>;

/** 1. Ultimate Scraper -- deep web scraping with JS rendering. */
async function ultimateScraper(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const url = body.url as string | undefined;
  if (!url) return { success: false, error: "url is required" };

  const maxPages = (body.maxPages as number) || 5;
  const items = await runActor("apify/website-content-crawler", {
    startUrls: [{ url }],
    maxCrawlPages: maxPages,
    crawlerType: (body.crawlerType as string) || "playwright:adaptive",
    maxConcurrency: 5,
  });

  return {
    success: true,
    data: {
      skill: "ultimate-scraper",
      url,
      pagesScraped: items.length,
      results: items,
    },
  };
}

/** 2. Market Research -- Google search-based market analysis. */
async function marketResearch(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const query = body.query as string | undefined;
  if (!query) return { success: false, error: "query is required" };

  const numResults = (body.numResults as number) || 20;
  const items = await runActor("apify/google-search-scraper", {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: numResults,
    languageCode: (body.language as string) || "en",
    countryCode: (body.country as string) || "us",
  });

  // Flatten organic results for easier consumption
  const organicResults = items.flatMap((item: any) =>
    (item.organicResults || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }))
  );

  return {
    success: true,
    data: {
      skill: "market-research",
      query,
      totalResults: organicResults.length,
      results: organicResults,
    },
  };
}

/** 3. Lead Generation -- extract contact info from websites. */
async function leadGeneration(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const url = body.url as string | undefined;
  const urls = body.urls as string[] | undefined;
  const startUrls = urls
    ? urls.map((u) => ({ url: u }))
    : url
      ? [{ url }]
      : null;

  if (!startUrls || startUrls.length === 0) {
    return { success: false, error: "url or urls is required" };
  }

  const items = await runActor("apify/contact-info-scraper", {
    startUrls,
    maxRequestsPerCrawl: (body.maxPages as number) || 20,
  });

  return {
    success: true,
    data: {
      skill: "lead-generation",
      leadsFound: items.length,
      results: items,
    },
  };
}

/** 4. Competitor Intelligence -- crawl competitor sites and extract structured content. */
async function competitorIntelligence(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const urls = body.urls as string[] | undefined;
  const url = body.url as string | undefined;
  const startUrls = urls
    ? urls.map((u) => ({ url: u }))
    : url
      ? [{ url }]
      : null;

  if (!startUrls || startUrls.length === 0) {
    return { success: false, error: "url or urls is required" };
  }

  const maxPages = (body.maxPages as number) || 10;
  const items = await runActor("apify/website-content-crawler", {
    startUrls,
    maxCrawlPages: maxPages,
    crawlerType: "playwright:adaptive",
    maxConcurrency: 5,
  });

  // Extract structured page data for comparison
  const pages = (items as any[]).map((item) => ({
    url: item.url,
    title: item.metadata?.title || item.title || "",
    description: item.metadata?.description || "",
    text: (item.text || "").slice(0, 2000),
    loadedAt: item.loadedAt,
  }));

  return {
    success: true,
    data: {
      skill: "competitor-intelligence",
      sitesAnalyzed: startUrls.length,
      pagesScraped: pages.length,
      results: pages,
    },
  };
}

/** 5. Trend Analysis -- analyze trending topics via Google Trends. */
async function trendAnalysis(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const terms = body.terms as string[] | undefined;
  const term = body.term as string | undefined;
  const searchTerms = terms || (term ? [term] : null);

  if (!searchTerms || searchTerms.length === 0) {
    return { success: false, error: "term or terms is required" };
  }

  const items = await runActor("apify/google-trends-scraper", {
    searchTerms,
    geo: (body.geo as string) || "",
    timeRange: (body.timeRange as string) || "now 7-d",
    isMultiple: searchTerms.length > 1,
  });

  return {
    success: true,
    data: {
      skill: "trend-analysis",
      terms: searchTerms,
      results: items,
    },
  };
}

/** 6. Content Analytics -- analyze social media content performance. */
async function contentAnalytics(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const urls = body.urls as string[] | undefined;
  const url = body.url as string | undefined;
  const startUrls = urls
    ? urls.map((u) => ({ url: u }))
    : url
      ? [{ url }]
      : null;

  if (!startUrls || startUrls.length === 0) {
    return {
      success: false,
      error: "url or urls is required (social media profile/post URLs)",
    };
  }

  // Use the website content crawler to extract social media page data
  const items = await runActor("apify/website-content-crawler", {
    startUrls,
    maxCrawlPages: startUrls.length,
    crawlerType: "playwright:adaptive",
  });

  const pages = (items as any[]).map((item) => ({
    url: item.url,
    title: item.metadata?.title || item.title || "",
    description: item.metadata?.description || "",
    text: (item.text || "").slice(0, 3000),
  }));

  return {
    success: true,
    data: {
      skill: "content-analytics",
      urlsAnalyzed: pages.length,
      results: pages,
    },
  };
}

/** 7. Brand Monitoring -- track brand mentions via Google search. */
async function brandMonitoring(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const brand = body.brand as string | undefined;
  if (!brand) return { success: false, error: "brand is required" };

  const keywords = body.keywords as string[] | undefined;
  const timeFrame = (body.timeFrame as string) || "d"; // d=day, w=week, m=month

  // Build search queries for the brand
  const queries = [
    `"${brand}"`,
    ...(keywords || []).map((kw) => `"${brand}" ${kw}`),
  ].join("\n");

  const items = await runActor("apify/google-search-scraper", {
    queries,
    maxPagesPerQuery: 1,
    resultsPerPage: (body.numResults as number) || 20,
    languageCode: (body.language as string) || "en",
    countryCode: (body.country as string) || "us",
    customDataFunction: `async ({ input, $, request, response, html }) => { return { timestamp: new Date().toISOString() }; }`,
  });

  const mentions = items.flatMap((item: any) =>
    (item.organicResults || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      source: new URL(r.url).hostname,
    }))
  );

  return {
    success: true,
    data: {
      skill: "brand-monitoring",
      brand,
      mentionsFound: mentions.length,
      results: mentions,
    },
  };
}

/** 8. Influencer Discovery -- find influencers via Google search and social profiles. */
async function influencerDiscovery(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  const niche = body.niche as string | undefined;
  if (!niche) return { success: false, error: "niche is required" };

  const platform = (body.platform as string) || "instagram";
  const numResults = (body.numResults as number) || 20;

  // Search for influencers by niche and platform
  const queries = [
    `site:${platform}.com ${niche} influencer`,
    `top ${niche} ${platform} influencers`,
    `${niche} content creator ${platform}`,
  ].join("\n");

  const items = await runActor("apify/google-search-scraper", {
    queries,
    maxPagesPerQuery: 1,
    resultsPerPage: numResults,
    languageCode: (body.language as string) || "en",
  });

  const profiles = items.flatMap((item: any) =>
    (item.organicResults || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      platform: r.url.includes("instagram")
        ? "instagram"
        : r.url.includes("tiktok")
          ? "tiktok"
          : r.url.includes("youtube")
            ? "youtube"
            : "other",
    }))
  );

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = profiles.filter((p: any) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  return {
    success: true,
    data: {
      skill: "influencer-discovery",
      niche,
      platform,
      profilesFound: unique.length,
      results: unique,
    },
  };
}

// ---------------------------------------------------------------------------
// Skill registry
// ---------------------------------------------------------------------------

const SKILLS: Record<string, { fn: SkillFn; description: string }> = {
  "ultimate-scraper": {
    fn: ultimateScraper,
    description:
      "Deep web scraping with JS rendering. Input: { url, maxPages?, crawlerType? }",
  },
  "market-research": {
    fn: marketResearch,
    description:
      "Market analysis via Google search. Input: { query, numResults?, language?, country? }",
  },
  "lead-generation": {
    fn: leadGeneration,
    description:
      "Extract contact info from websites. Input: { url | urls, maxPages? }",
  },
  "competitor-intelligence": {
    fn: competitorIntelligence,
    description:
      "Monitor competitor websites and extract structured content. Input: { url | urls, maxPages? }",
  },
  "trend-analysis": {
    fn: trendAnalysis,
    description:
      "Analyze trending topics via Google Trends. Input: { term | terms, geo?, timeRange? }",
  },
  "content-analytics": {
    fn: contentAnalytics,
    description:
      "Analyze content from social/web pages. Input: { url | urls }",
  },
  "brand-monitoring": {
    fn: brandMonitoring,
    description:
      "Track brand mentions across the web. Input: { brand, keywords?, timeFrame?, numResults? }",
  },
  "influencer-discovery": {
    fn: influencerDiscovery,
    description:
      "Find relevant influencers by niche. Input: { niche, platform?, numResults? }",
  },
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handler(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (!config.apify.apiToken) {
    return { success: false, error: "Apify API token not configured" };
  }

  const skill = body.skill as string | undefined;

  // If no skill is specified, return available skills
  if (!skill) {
    return {
      success: true,
      data: {
        message: "Specify a 'skill' field to use a specific capability.",
        availableSkills: Object.entries(SKILLS).map(([id, s]) => ({
          id,
          description: s.description,
        })),
      },
    };
  }

  const entry = SKILLS[skill];
  if (!entry) {
    return {
      success: false,
      error: `Unknown skill "${skill}". Available: ${Object.keys(SKILLS).join(", ")}`,
    };
  }

  try {
    return await entry.fn(body);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Service registration
// ---------------------------------------------------------------------------

registerService({
  id: "apify-skills",
  name: "Apify Skills Agent",
  description:
    "CloudAGI Apify Skills Agent — a multi-skill data intelligence service powered by Apify. " +
    "Capabilities include deep web scraping with JS rendering, market research, lead generation, " +
    "competitor intelligence, trend analysis, content analytics, brand monitoring, and influencer " +
    "discovery. Specify a 'skill' field in the request body to choose a capability. " +
    "Call without a skill to list all available skills and their required inputs.",
  category: "data",
  priceLabel: "0.25 USDC",
  priceAmount: "0.25",
  priceCurrency: "USDC",
  tags: [
    "apify",
    "scraping",
    "market-research",
    "lead-generation",
    "competitor-intelligence",
    "trend-analysis",
    "brand-monitoring",
    "influencer-discovery",
    "data",
    "agent",
    "cloudagi",
    "marketplace",
  ],
  handler,
});
