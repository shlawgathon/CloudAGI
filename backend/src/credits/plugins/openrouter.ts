import { config } from "../../config";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// OpenRouter credit plugin — reads key info from OpenRouter's auth endpoint
// ---------------------------------------------------------------------------

async function probe(): Promise<ProbeResult> {
  const apiKey = config.openrouter.apiKey;

  if (!apiKey) {
    return {
      lines: [],
      error: "OPENROUTER_API_KEY is not set in the environment.",
    };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `OpenRouter API returned ${res.status}: ${res.statusText}`,
      };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const data = (body["data"] as Record<string, unknown>) ?? body;
    const lines: MetricLine[] = [];
    let plan: string | undefined;

    // Label / name for the key
    const label = (data["label"] as string | undefined) ?? (data["name"] as string | undefined);
    if (label) {
      lines.push({ type: "text", label: "Key", value: label });
    }

    // Usage & limit
    const usage =
      typeof data["usage"] === "number"
        ? data["usage"]
        : null;
    const limit =
      typeof data["limit"] === "number"
        ? data["limit"]
        : null;

    if (usage !== null && limit !== null && limit > 0) {
      lines.push({
        type: "progress",
        label: "Credits used",
        used: usage,
        limit,
      });
    } else if (usage !== null) {
      lines.push({ type: "text", label: "Credits used", value: `$${usage.toFixed(4)}` });
    }

    // Rate limit info
    const rateLimit = data["rate_limit"] as Record<string, unknown> | undefined;
    if (rateLimit) {
      const requests = rateLimit["requests"];
      const interval = rateLimit["interval"];
      if (typeof requests === "number" && typeof interval === "string") {
        lines.push({ type: "text", label: "Rate limit", value: `${requests} req / ${interval}` });
      }
    }

    // Is free tier?
    const isFree = data["is_free_tier"] as boolean | undefined;
    if (typeof isFree === "boolean") {
      plan = isFree ? "Free" : "Paid";
      lines.push({
        type: "badge",
        label: "Tier",
        value: plan,
        variant: isFree ? "default" : "success",
      });
    }

    if (lines.length === 0) {
      lines.push({ type: "text", label: "Status", value: "Active — no usage data available" });
    }

    return { plan, lines };
  } catch (err) {
    return {
      lines: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const lineDefinitions: LineDefinition[] = [
  { type: "text", label: "Key", scope: "overview", primaryOrder: 0 },
  { type: "progress", label: "Credits used", scope: "overview", primaryOrder: 1 },
  { type: "text", label: "Rate limit", scope: "detail" },
  { type: "badge", label: "Tier", scope: "detail" },
];

export const openrouterPlugin: CreditPlugin = {
  id: "openrouter",
  name: "OpenRouter",
  icon: "",
  brandColor: "#6366F1",
  links: [
    { label: "Dashboard", url: "https://openrouter.ai/keys" },
    { label: "Usage", url: "https://openrouter.ai/activity" },
  ],
  lines: lineDefinitions,
  probe,
};
