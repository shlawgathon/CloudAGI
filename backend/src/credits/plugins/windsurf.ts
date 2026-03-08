import { homedir } from "node:os";
import { join } from "node:path";
import type { CreditPlugin, LineDefinition, MetricLine, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Windsurf credit plugin — reads usage via Codeium's SeatManagement API
// ---------------------------------------------------------------------------

const DB_PATHS = [
  join(
    homedir(),
    "Library",
    "Application Support",
    "Windsurf",
    "User",
    "globalStorage",
    "state.vscdb",
  ),
  join(
    homedir(),
    "Library",
    "Application Support",
    "Windsurf Next",
    "User",
    "globalStorage",
    "state.vscdb",
  ),
];

const STATUS_KEY = "windsurfAuthStatus";
const USER_STATUS_URL =
  "https://server.codeium.com/exa.seat_management_pb.SeatManagementService/GetUserStatus";

interface WindsurfAuthStatus {
  apiKey?: string;
  token?: string;
  [key: string]: unknown;
}

/** Read the Windsurf API key from the SQLite state database. */
async function getWindsurfApiKey(): Promise<string | null> {
  // Use Bun's SQLite support to query the state.vscdb
  let Database: typeof import("bun:sqlite").Database | undefined;
  try {
    // Dynamic import to avoid hard failure when bun:sqlite unavailable
    const mod = await import("bun:sqlite");
    Database = mod.Database;
  } catch {
    return null;
  }

  for (const dbPath of DB_PATHS) {
    try {
      const dbFile = Bun.file(dbPath);
      if (!(await dbFile.exists())) {
        continue;
      }

      const db = new Database(dbPath, { readonly: true });
      try {
        const row = db
          .query<{ value: string }, [string]>(
            "SELECT value FROM ItemTable WHERE key = ?",
          )
          .get(STATUS_KEY);

        if (row?.value) {
          const parsed = JSON.parse(row.value) as WindsurfAuthStatus;
          const key = parsed.apiKey ?? parsed.token;
          if (typeof key === "string" && key.length > 0) {
            return key;
          }
        }
      } finally {
        db.close();
      }
    } catch {
      // Try next path
    }
  }

  return null;
}

/** Shape of the GetUserStatus protobuf-JSON response. */
interface UserStatusResponse {
  userStatus?: {
    promptCreditsBalance?: number;
    promptCreditsLimit?: number;
    flexCreditsBalance?: number;
    flexCreditsLimit?: number;
    // Legacy fields
    creditBalance?: number;
    creditLimit?: number;
    resetAt?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function probe(): Promise<ProbeResult> {
  const apiKey = await getWindsurfApiKey();
  if (!apiKey) {
    return {
      lines: [],
      error: `No Windsurf API key found. Sign into Windsurf and try again. Checked paths:\n${DB_PATHS.join("\n")}`,
    };
  }

  try {
    const res = await fetch(USER_STATUS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Protobuf-JSON: empty request body
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      return {
        lines: [],
        error: `Windsurf/Codeium API returned ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as UserStatusResponse;
    const status = data.userStatus;
    const lines: MetricLine[] = [];

    if (!status) {
      lines.push({ type: "badge", label: "Status", value: "Active", variant: "success" });
      return { lines };
    }

    const resetAt = typeof status["resetAt"] === "string" ? status["resetAt"] : undefined;

    // Prompt credits
    if (
      typeof status["promptCreditsBalance"] === "number" &&
      typeof status["promptCreditsLimit"] === "number" &&
      status["promptCreditsLimit"] > 0
    ) {
      const limit = status["promptCreditsLimit"];
      const remaining = status["promptCreditsBalance"];
      const used = limit - remaining;
      lines.push({
        type: "progress",
        label: "Prompt Credits",
        used,
        limit,
        resetAt,
      });
      lines.push({
        type: "text",
        label: "Prompt Credits Remaining",
        value: String(remaining),
      });
    }

    // Flex credits
    if (
      typeof status["flexCreditsBalance"] === "number" &&
      typeof status["flexCreditsLimit"] === "number" &&
      status["flexCreditsLimit"] > 0
    ) {
      const limit = status["flexCreditsLimit"];
      const remaining = status["flexCreditsBalance"];
      const used = limit - remaining;
      lines.push({
        type: "progress",
        label: "Flex Credits",
        used,
        limit,
        resetAt,
      });
      lines.push({
        type: "text",
        label: "Flex Credits Remaining",
        value: String(remaining),
      });
    }

    // Legacy credit balance fallback
    if (
      lines.length === 0 &&
      typeof status["creditBalance"] === "number" &&
      typeof status["creditLimit"] === "number" &&
      status["creditLimit"] > 0
    ) {
      const limit = status["creditLimit"];
      const remaining = status["creditBalance"];
      const used = limit - remaining;
      lines.push({
        type: "progress",
        label: "Credits",
        used,
        limit,
        resetAt,
      });
      lines.push({
        type: "text",
        label: "Credits Remaining",
        value: String(remaining),
      });
    }

    if (lines.length === 0) {
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
  { type: "progress", label: "Prompt Credits", scope: "overview", primaryOrder: 0 },
  { type: "progress", label: "Flex Credits", scope: "overview", primaryOrder: 1 },
  { type: "text", label: "Prompt Credits Remaining", scope: "detail" },
  { type: "text", label: "Flex Credits Remaining", scope: "detail" },
  { type: "badge", label: "Status", scope: "detail" },
];

export const windsurfPlugin: CreditPlugin = {
  id: "windsurf",
  name: "Windsurf",
  icon: "🏄",
  brandColor: "#06b6d4",
  links: [
    { label: "Dashboard", url: "https://windsurf.com" },
    { label: "Account", url: "https://codeium.com/account/dashboard" },
  ],
  lines: lineDefinitions,
  probe,
};
