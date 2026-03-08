import { homedir } from "node:os";
import { join } from "node:path";
import { readKeychain } from "../keychain";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// GitHub Copilot credit plugin — reads usage via GitHub's internal Copilot API
// ---------------------------------------------------------------------------

const GH_HOSTS_PATH = join(homedir(), ".config", "gh", "hosts.yml");

/** Parse a simple YAML key: value line from gh's hosts.yml */
function extractYamlValue(yaml: string, key: string): string | null {
  const regex = new RegExp(`^\\s*${key}:\\s*(.+)$`, "m");
  const match = regex.exec(yaml);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;
}

async function getGhToken(): Promise<string | null> {
  // Primary: macOS Keychain via gh CLI
  const keychainToken = await readKeychain("gh:github.com");
  if (keychainToken) {
    // gh stores tokens as "go-keyring-base64:<base64>" on some systems
    if (keychainToken.startsWith("go-keyring-base64:")) {
      try {
        const b64 = keychainToken.slice("go-keyring-base64:".length);
        const decoded = Buffer.from(b64, "base64").toString("utf-8");
        if (decoded.length > 0) return decoded;
      } catch {
        // fall through
      }
    }
    // Otherwise use as-is
    if (keychainToken.startsWith("gho_") || keychainToken.startsWith("ghp_")) {
      return keychainToken;
    }
  }

  // Fallback: parse ~/.config/gh/hosts.yml
  try {
    const file = Bun.file(GH_HOSTS_PATH);
    if (await file.exists()) {
      const yaml = await file.text();
      const token = extractYamlValue(yaml, "oauth_token");
      if (token && token.length > 0) return token;
    }
  } catch {
    // ignore
  }

  return null;
}

async function probe(): Promise<ProbeResult> {
  const token = await getGhToken();
  if (!token) {
    return {
      lines: [],
      error: "No GitHub token found. Log in via `gh auth login`.",
    };
  }

  try {
    const res = await fetch("https://api.github.com/copilot_internal/user", {
      headers: {
        Authorization: `token ${token}`,
        "Editor-Version": "vscode/1.96.2",
        "Editor-Plugin-Version": "copilot-chat/0.25.2024",
        "User-Agent": "GitHubCopilotChat/0.25.2024",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `GitHub API returned ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const lines: MetricLine[] = [];
    let plan: string | undefined;

    // Real response: { copilot_plan, access_type_sku, quota_reset_date,
    //   quota_snapshots: { chat: { unlimited, percent_remaining, ... },
    //     completions: { ... }, premium_interactions: { remaining, percent_remaining, ... } } }

    const copilotPlan = data["copilot_plan"] as string | undefined;
    const sku = data["access_type_sku"] as string | undefined;
    plan = copilotPlan ?? "Free";
    if (sku) {
      const label = sku.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push({ type: "text", label: "Plan", value: `${plan} (${label})` });
    }

    const resetDate = data["quota_reset_date"] as string | undefined;

    // Parse quota_snapshots
    const snapshots = data["quota_snapshots"] as Record<string, Record<string, unknown>> | undefined;
    if (snapshots) {
      for (const [quotaId, quota] of Object.entries(snapshots)) {
        const unlimited = quota["unlimited"] as boolean | undefined;
        const pctRemaining = quota["percent_remaining"] as number | undefined;
        const remaining = quota["remaining"] as number | undefined;

        const label = quotaId === "premium_interactions"
          ? "Premium requests"
          : quotaId.charAt(0).toUpperCase() + quotaId.slice(1);

        if (unlimited) {
          lines.push({
            type: "badge",
            label,
            value: "Unlimited",
            variant: "success",
          });
        } else if (typeof pctRemaining === "number") {
          const used = 100 - pctRemaining;
          lines.push({
            type: "progress",
            label,
            used,
            limit: 100,
            resetAt: resetDate,
          });
          if (typeof remaining === "number") {
            lines.push({
              type: "text",
              label: `${label} remaining`,
              value: String(remaining),
            });
          }
        }
      }
    }

    if (lines.length === 0) {
      lines.push({ type: "text", label: "Status", value: "Active" });
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
  { type: "text", label: "Plan", scope: "overview", primaryOrder: 0 },
  { type: "badge", label: "Chat", scope: "overview", primaryOrder: 1 },
  { type: "progress", label: "Chat turns", scope: "detail" },
  { type: "progress", label: "Completions", scope: "detail" },
];

export const copilotPlugin: CreditPlugin = {
  id: "copilot",
  name: "GitHub Copilot",
  icon: "",
  brandColor: "#6e40c9",
  links: [
    { label: "Settings", url: "https://github.com/settings/copilot" },
    { label: "Billing", url: "https://github.com/settings/billing" },
  ],
  lines: lineDefinitions,
  probe,
};
