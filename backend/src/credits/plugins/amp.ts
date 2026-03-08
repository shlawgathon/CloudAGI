import { homedir } from "node:os";
import { join } from "node:path";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Amp Code credit plugin — reads balance via Amp's internal API
// ---------------------------------------------------------------------------

const SECRETS_PATH = join(homedir(), ".local", "share", "amp", "secrets.json");
const API_URL = "https://ampcode.com/api/internal";
const API_KEY_FIELD = "apiKey@https://ampcode.com/";

async function getAmpApiKey(): Promise<string | null> {
  try {
    const file = Bun.file(SECRETS_PATH);
    if (!(await file.exists())) {
      return null;
    }
    const raw = await file.text();
    const secrets = JSON.parse(raw) as Record<string, unknown>;
    const key = secrets[API_KEY_FIELD];
    if (typeof key === "string" && key.length > 0) {
      return key;
    }
    return null;
  } catch {
    return null;
  }
}

async function probe(): Promise<ProbeResult> {
  const apiKey = await getAmpApiKey();
  if (!apiKey) {
    return {
      lines: [],
      error: `No Amp API key found. Expected key "${API_KEY_FIELD}" in ${SECRETS_PATH}`,
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method: "userDisplayBalanceInfo", params: {} }),
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `Amp API returned ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      ok?: boolean;
      result?: { displayText?: string };
      error?: string;
    };

    if (!data.ok) {
      return {
        lines: [],
        error: data.error ?? "Amp API returned ok=false",
      };
    }

    const lines: MetricLine[] = [];
    const displayText = data.result?.displayText;

    if (displayText && displayText.length > 0) {
      // displayText is a human-readable balance string like "$12.34" or "1,234 credits"
      // Try to parse a numeric value for a progress line; fall back to text line.
      const numericMatch = /[\d,]+(\.\d+)?/.exec(displayText);
      if (numericMatch) {
        const parsed = parseFloat(numericMatch[0].replace(/,/g, ""));
        if (!isNaN(parsed)) {
          lines.push({
            type: "text",
            label: "Balance",
            value: displayText,
          });
        } else {
          lines.push({ type: "text", label: "Balance", value: displayText });
        }
      } else {
        lines.push({ type: "text", label: "Balance", value: displayText });
      }
    } else {
      lines.push({ type: "badge", label: "Status", value: "Active", variant: "success" });
    }

    return { lines };
  } catch (err) {
    return {
      lines: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const lineDefinitions: LineDefinition[] = [
  { type: "text", label: "Balance", scope: "overview", primaryOrder: 0 },
  { type: "badge", label: "Status", scope: "detail" },
];

export const ampPlugin: CreditPlugin = {
  id: "amp",
  name: "Amp Code",
  icon: "⚡",
  brandColor: "#f59e0b",
  links: [
    { label: "Dashboard", url: "https://ampcode.com" },
    { label: "Billing", url: "https://ampcode.com/billing" },
  ],
  lines: lineDefinitions,
  probe,
};
