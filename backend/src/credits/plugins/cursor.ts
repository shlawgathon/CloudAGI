import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
import { readKeychain } from "../keychain";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Cursor credit plugin — mirrors the Cursor usage panel (Pro+ percentage view)
// ---------------------------------------------------------------------------

const CURSOR_VSCDB_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Cursor",
  "User",
  "globalStorage",
  "state.vscdb",
);

const CURSOR_API_BASE = "https://api2.cursor.sh";
const CURSOR_OAUTH_CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

interface TokenPair {
  accessToken: string;
  refreshToken: string | null;
}

function readTokensFromDb(): TokenPair | null {
  try {
    const vscdb = new Database(CURSOR_VSCDB_PATH, { readonly: true });
    try {
      const accessRow = vscdb
        .prepare<{ value: string }, [string]>(
          "SELECT value FROM ItemTable WHERE key = ?",
        )
        .get("cursorAuth/accessToken");
      const refreshRow = vscdb
        .prepare<{ value: string }, [string]>(
          "SELECT value FROM ItemTable WHERE key = ?",
        )
        .get("cursorAuth/refreshToken");

      const accessToken = accessRow?.value ?? null;
      const refreshToken = refreshRow?.value ?? null;

      if (!accessToken || accessToken.length === 0) return null;

      // Values are raw JWT strings (not JSON-wrapped)
      return { accessToken, refreshToken };
    } finally {
      vscdb.close();
    }
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  // Primary: read from Cursor's SQLite state database
  const tokens = readTokensFromDb();
  if (tokens) return tokens.accessToken;

  // Fallback: macOS Keychain
  return readKeychain("cursor-access-token");
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokensFromDb();
  if (!tokens?.refreshToken) return null;

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: CURSOR_OAUTH_CLIENT_ID,
    });

    const res = await fetch(`${CURSOR_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const newToken = data["access_token"];
    return typeof newToken === "string" ? newToken : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const DASHBOARD_HEADERS = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
});

async function callDashboard(
  endpoint: string,
  token: string,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${CURSOR_API_BASE}/aiserver.v1.DashboardService/${endpoint}`, {
    method: "POST",
    headers: DASHBOARD_HEADERS(token),
    body: "{}",
  });
  if (!res.ok) return { ok: false, status: res.status, data: {} };
  const data = (await res.json()) as Record<string, unknown>;
  return { ok: true, status: res.status, data };
}

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

/*
 * Real API response shapes:
 *
 * GetCurrentPeriodUsage:
 * {
 *   billingCycleStart: "1772425036000",
 *   billingCycleEnd: "1775103436000",
 *   planUsage: {
 *     totalSpend: 1150,          // raw spend units (internal, not shown)
 *     includedSpend: 1150,
 *     remaining: 5850,
 *     limit: 7000,
 *     remainingBonus: false,
 *     autoPercentUsed: 0.9075,   // percent USED (0–100)
 *     apiPercentUsed: 7.154545,  // percent USED (0–100)
 *     totalPercentUsed: 2.2549,  // percent USED (0–100)
 *   },
 *   autoModelSelectedDisplayMessage: "You've used 2% of your included total usage",
 *   namedModelSelectedDisplayMessage: "You've used 7% of your included API usage",
 * }
 *
 * GetPlanInfo:
 * {
 *   planInfo: { planName: "Pro+", includedAmountCents: 7000, price: "$60/mo",
 *               billingCycleEnd: "1775103436000" }
 * }
 *
 * GetCreditGrantsBalance: {} (empty for Pro+ users)
 *
 * The Cursor UI shows "X% left" = 100 - percentUsed.
 * We store `used = percentUsed` and `limit = 100` so the progress bar
 * renders correctly with "% left" semantics handled by the UI.
 */

async function probe(): Promise<ProbeResult> {
  let token = await getAccessToken();
  if (!token) {
    return {
      lines: [],
      error: "No Cursor auth token found. Log in via the Cursor editor.",
    };
  }

  try {
    // Fetch all three APIs in parallel
    let [usageResult, planResult] = await Promise.all([
      callDashboard("GetCurrentPeriodUsage", token),
      callDashboard("GetPlanInfo", token),
    ]);

    // Handle 401 with token refresh
    if (usageResult.status === 401 || planResult.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = refreshed;
        [usageResult, planResult] = await Promise.all([
          callDashboard("GetCurrentPeriodUsage", token),
          callDashboard("GetPlanInfo", token),
        ]);
      }
    }

    if (!usageResult.ok) {
      return {
        lines: [],
        error: `Cursor API returned ${usageResult.status}. Try logging in again.`,
      };
    }

    // -----------------------------------------------------------------------
    // Parse plan name
    // -----------------------------------------------------------------------
    const planInfo = planResult.data["planInfo"] as Record<string, unknown> | undefined;
    const planName = typeof planInfo?.["planName"] === "string"
      ? planInfo["planName"]
      : "Pro";

    // -----------------------------------------------------------------------
    // Parse usage
    // -----------------------------------------------------------------------
    const usageData = usageResult.data;
    const planUsage = usageData["planUsage"] as Record<string, unknown> | undefined;

    // Billing cycle end → ISO timestamp for reset display
    const billingCycleEndRaw =
      (planInfo?.["billingCycleEnd"] as string | undefined) ??
      (usageData["billingCycleEnd"] as string | undefined);
    const resetAt = billingCycleEndRaw
      ? new Date(Number(billingCycleEndRaw)).toISOString()
      : undefined;

    const lines: MetricLine[] = [];

    if (planUsage) {
      // Cursor shows "X% left" — percentages are USED values (0–100 scale).
      // We use used = percentUsed, limit = 100 so the UI can compute pct left.

      const totalPercentUsed = planUsage["totalPercentUsed"] as number | undefined;
      if (typeof totalPercentUsed === "number") {
        lines.push({
          type: "progress",
          label: "Total usage",
          used: Math.round(totalPercentUsed * 10) / 10,
          limit: 100,
          resetAt,
        });
      }

      const autoPercentUsed = planUsage["autoPercentUsed"] as number | undefined;
      if (typeof autoPercentUsed === "number") {
        lines.push({
          type: "progress",
          label: "Auto usage",
          used: Math.round(autoPercentUsed * 10) / 10,
          limit: 100,
          resetAt,
        });
      }

      const apiPercentUsed = planUsage["apiPercentUsed"] as number | undefined;
      if (typeof apiPercentUsed === "number") {
        lines.push({
          type: "progress",
          label: "API usage",
          used: Math.round(apiPercentUsed * 10) / 10,
          limit: 100,
          resetAt,
        });
      }
    }

    // Fallback: display message from the API
    if (lines.length === 0) {
      const displayMsg =
        (usageData["autoModelSelectedDisplayMessage"] as string | undefined) ??
        (usageData["displayMessage"] as string | undefined);
      if (displayMsg) {
        lines.push({ type: "text", label: "Status", value: displayMsg });
      } else {
        lines.push({ type: "text", label: "Status", value: "Active — no usage data" });
      }
    }

    return { plan: planName, lines };
  } catch (err) {
    return {
      lines: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

const lineDefinitions: LineDefinition[] = [
  { type: "progress", label: "Total usage", scope: "overview", primaryOrder: 0 },
  { type: "progress", label: "Auto usage", scope: "overview", primaryOrder: 1 },
  { type: "progress", label: "API usage", scope: "detail" },
];

export const cursorPlugin: CreditPlugin = {
  id: "cursor",
  name: "Cursor",
  icon: "",
  brandColor: "#00D4AA",
  links: [
    { label: "Dashboard", url: "https://cursor.sh/settings" },
    { label: "Billing", url: "https://cursor.sh/settings/billing" },
  ],
  lines: lineDefinitions,
  probe,
};
