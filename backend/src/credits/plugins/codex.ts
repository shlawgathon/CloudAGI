import { homedir } from "node:os";
import { join } from "node:path";
import { readKeychain } from "../keychain";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Codex credit plugin — reads usage from ChatGPT's wham usage endpoint
// Source: OpenUsage confirmed API details
// ---------------------------------------------------------------------------

const CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const CODEX_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

/** Auth file paths to check in order (per OpenUsage source). */
function getCodexAuthPaths(): string[] {
  const paths: string[] = [];

  // 1. $CODEX_HOME/auth.json (highest priority)
  const codexHome = process.env["CODEX_HOME"];
  if (codexHome) {
    paths.push(join(codexHome, "auth.json"));
  }

  // 2. ~/.config/codex/auth.json
  paths.push(join(homedir(), ".config", "codex", "auth.json"));

  // 3. ~/.codex/auth.json
  paths.push(join(homedir(), ".codex", "auth.json"));

  return paths;
}

interface CodexCredentials {
  accessToken: string;
  refreshToken?: string;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CODEX_OAUTH_CLIENT_ID,
    });

    const res = await fetch(CODEX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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

async function readCredentials(): Promise<CodexCredentials | null> {
  // 1–3: file-based auth locations
  for (const authPath of getCodexAuthPaths()) {
    try {
      const file = Bun.file(authPath);
      if (await file.exists()) {
        const raw = await file.text();
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        // Support both nested { tokens: { access_token, refresh_token } }
        // and flat { access_token, refresh_token } shapes
        const tokens = parsed["tokens"] as Record<string, unknown> | undefined;
        const accessToken =
          (tokens?.["access_token"] ?? parsed["access_token"]) as string | undefined;
        const refreshToken =
          (tokens?.["refresh_token"] ?? parsed["refresh_token"]) as string | undefined;

        if (typeof accessToken === "string" && accessToken.length > 0) {
          return {
            accessToken,
            refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
          };
        }
      }
    } catch {
      // try next path
    }
  }

  // 4. macOS Keychain service "Codex Auth"
  const keychainRaw = await readKeychain("Codex Auth");
  if (keychainRaw) {
    try {
      const parsed = JSON.parse(keychainRaw) as Record<string, unknown>;
      const tokens = parsed["tokens"] as Record<string, unknown> | undefined;
      const accessToken =
        (tokens?.["access_token"] ?? parsed["access_token"]) as string | undefined;
      const refreshToken =
        (tokens?.["refresh_token"] ?? parsed["refresh_token"]) as string | undefined;
      if (typeof accessToken === "string" && accessToken.length > 0) {
        return {
          accessToken,
          refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
        };
      }
    } catch {
      // Raw token stored directly in keychain
      if (keychainRaw.length > 0) {
        return { accessToken: keychainRaw };
      }
    }
  }

  return null;
}

async function getAccessToken(): Promise<string | null> {
  const creds = await readCredentials();
  if (!creds) return null;

  // If we have a refresh token, attempt proactive refresh.
  // The API will return 401 if the access token is expired; we handle that below too.
  if (creds.refreshToken) {
    const refreshed = await refreshAccessToken(creds.refreshToken);
    if (refreshed) return refreshed;
  }

  return creds.accessToken;
}

async function probe(): Promise<ProbeResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      lines: [],
      error: "No Codex auth token found. Log in via `codex auth login`.",
    };
  }

  try {
    const res = await fetch(CODEX_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `Codex API returned ${res.status}: ${res.statusText}`,
      };
    }

    const lines: MetricLine[] = [];

    // Primary data source: response headers
    // x-codex-primary-used-percent   — primary window usage %
    // x-codex-secondary-used-percent — secondary window usage %
    // x-codex-credits-balance        — credit balance (string, may include currency symbol)
    const primaryPct = res.headers.get("x-codex-primary-used-percent");
    const secondaryPct = res.headers.get("x-codex-secondary-used-percent");
    const creditsBalance = res.headers.get("x-codex-credits-balance");

    if (primaryPct !== null) {
      const pct = parseFloat(primaryPct);
      if (!Number.isNaN(pct)) {
        lines.push({
          type: "progress",
          label: "Primary usage",
          used: pct,
          limit: 100,
        });
      }
    }

    if (secondaryPct !== null) {
      const pct = parseFloat(secondaryPct);
      if (!Number.isNaN(pct)) {
        lines.push({
          type: "progress",
          label: "Secondary usage",
          used: pct,
          limit: 100,
        });
      }
    }

    if (creditsBalance !== null) {
      lines.push({ type: "text", label: "Credits balance", value: creditsBalance });
    }

    if (lines.length === 0) {
      lines.push({ type: "text", label: "Status", value: "Active — no usage data available" });
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
  { type: "progress", label: "Primary usage", scope: "overview", primaryOrder: 0 },
  { type: "progress", label: "Secondary usage", scope: "overview", primaryOrder: 1 },
  { type: "text", label: "Credits balance", scope: "detail" },
];

export const codexPlugin: CreditPlugin = {
  id: "codex",
  name: "OpenAI Codex",
  icon: "",
  brandColor: "#10A37F",
  links: [
    { label: "Dashboard", url: "https://platform.openai.com/usage" },
    { label: "Billing", url: "https://platform.openai.com/account/billing" },
  ],
  lines: lineDefinitions,
  probe,
};
