import { homedir } from "node:os";
import { join } from "node:path";
import { readKeychain } from "../keychain";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Claude credit plugin — reads usage from Anthropic's OAuth usage API
// Source: OpenUsage confirmed API details
// ---------------------------------------------------------------------------

const CLAUDE_CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");
const CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CLAUDE_USER_AGENT = "claude-code/2.1.69";

interface ClaudeCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix ms
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    // Base64url decode the payload
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as Record<string, unknown>;
    const exp = payload["exp"];
    if (typeof exp !== "number") return false;
    // Treat as expired if within 60 seconds of expiry
    return Date.now() / 1000 >= exp - 60;
  } catch {
    return false;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLAUDE_OAUTH_CLIENT_ID,
    });

    const res = await fetch(CLAUDE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CLAUDE_USER_AGENT,
      },
      body: body.toString(),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const newToken = data["access_token"];
    return typeof newToken === "string" && newToken.length > 0 ? newToken : null;
  } catch {
    return null;
  }
}

async function readCredentials(): Promise<ClaudeCredentials | null> {
  // Primary: ~/.claude/.credentials.json
  try {
    const file = Bun.file(CLAUDE_CREDENTIALS_PATH);
    if (await file.exists()) {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const oauth = parsed["claudeAiOauth"] as Record<string, unknown> | undefined;
      const accessToken = oauth?.["accessToken"];
      const refreshToken = oauth?.["refreshToken"];
      const expiresAt = oauth?.["expiresAt"];
      if (typeof accessToken === "string" && accessToken.length > 0) {
        return {
          accessToken,
          refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
          expiresAt: typeof expiresAt === "number" ? expiresAt : undefined,
        };
      }
    }
  } catch {
    // fall through to keychain
  }

  // Fallback: macOS Keychain (value is JSON blob, same structure)
  const keychainRaw = await readKeychain("Claude Code-credentials");
  if (keychainRaw) {
    try {
      const parsed = JSON.parse(keychainRaw) as Record<string, unknown>;
      const oauth = parsed["claudeAiOauth"] as Record<string, unknown> | undefined;
      const accessToken = oauth?.["accessToken"];
      const refreshToken = oauth?.["refreshToken"];
      if (typeof accessToken === "string" && accessToken.length > 0) {
        return {
          accessToken,
          refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
        };
      }
    } catch {
      // If not JSON, try raw sk-ant- token (no refresh possible in this case)
      if (keychainRaw.startsWith("sk-ant-")) {
        return { accessToken: keychainRaw };
      }
    }
  }

  return null;
}

async function getAccessToken(): Promise<string | null> {
  const creds = await readCredentials();
  if (!creds) return null;

  const { accessToken, refreshToken, expiresAt } = creds;

  // Determine if token needs refresh: check expiresAt field or decode JWT
  const needsRefresh =
    (expiresAt !== undefined && Date.now() >= expiresAt - 60_000) ||
    isJwtExpired(accessToken);

  if (needsRefresh && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) return newToken;
  }

  return accessToken;
}

interface UsageBucket {
  utilization?: number;
  resets_at?: string;
}

async function probe(): Promise<ProbeResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      lines: [],
      error: "No Claude auth token found. Log in via the Claude desktop app.",
    };
  }

  try {
    const res = await fetch(CLAUDE_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": CLAUDE_USER_AGENT,
      },
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `Anthropic API returned ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as Record<string, unknown>;

    // Response format (utilization is 0–1 float, e.g. 0.89 = 89% used):
    // {
    //   five_hour:       { utilization: 0.89, resets_at: "2024-..." },
    //   seven_day:       { utilization: 0.52, resets_at: "2024-..." },
    //   seven_day_sonnet: { utilization: 0.06, resets_at: "2024-..." },
    //   extra_usage:     { is_enabled: false, ... }
    // }

    const fiveHour = data["five_hour"] as UsageBucket | undefined;
    const sevenDay = data["seven_day"] as UsageBucket | undefined;
    const sevenDaySonnet = data["seven_day_sonnet"] as UsageBucket | undefined;

    const lines: MetricLine[] = [];

    if (fiveHour && typeof fiveHour.utilization === "number") {
      lines.push({
        type: "progress",
        label: "Session (5h)",
        // utilization is 0–1; multiply by 100 to get a percentage out of 100
        used: Math.round(fiveHour.utilization * 100),
        limit: 100,
        resetAt: fiveHour.resets_at,
        pacePercent: 50,
      });
    }

    if (sevenDay && typeof sevenDay.utilization === "number") {
      lines.push({
        type: "progress",
        label: "Weekly",
        used: Math.round(sevenDay.utilization * 100),
        limit: 100,
        resetAt: sevenDay.resets_at,
      });
    }

    if (sevenDaySonnet && typeof sevenDaySonnet.utilization === "number") {
      lines.push({
        type: "progress",
        label: "Sonnet Weekly",
        used: Math.round(sevenDaySonnet.utilization * 100),
        limit: 100,
        resetAt: sevenDaySonnet.resets_at,
      });
    }

    if (lines.length === 0) {
      lines.push({ type: "text", label: "Status", value: "Active — no usage data" });
    }

    return { plan: "Pro", lines };
  } catch (err) {
    return {
      lines: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const lineDefinitions: LineDefinition[] = [
  { type: "progress", label: "Session (5h)", scope: "overview", primaryOrder: 0 },
  { type: "progress", label: "Weekly", scope: "overview", primaryOrder: 1 },
  { type: "progress", label: "Sonnet Weekly", scope: "detail" },
];

export const claudePlugin: CreditPlugin = {
  id: "claude",
  name: "Claude (Anthropic)",
  icon: "",
  brandColor: "#D97706",
  links: [
    { label: "Console", url: "https://console.anthropic.com" },
    { label: "Usage", url: "https://console.anthropic.com/settings/usage" },
  ],
  lines: lineDefinitions,
  probe,
};
