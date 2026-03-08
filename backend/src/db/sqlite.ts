import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

// ---------------------------------------------------------------------------
// Singleton SQLite database with WAL mode and schema migrations
// ---------------------------------------------------------------------------

// Default to ./data/cloudagi.db so it lands inside the Docker-mounted volume
// (/app/data) when CLOUDAGI_DB_PATH is unset. The legacy ~/.cloudagi path
// was host-only and not accessible inside the container.
const DB_PATH = process.env.CLOUDAGI_DB_PATH ?? "./data/cloudagi.db";

// Ensure the parent directory exists before opening the database
const dbDir = dirname(DB_PATH);
try {
  mkdirSync(dbDir, { recursive: true });
} catch {
  // Directory likely already exists; ignore
}

export const db = new Database(DB_PATH, { create: true });

// WAL mode for better concurrent read performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ---------------------------------------------------------------------------
// Migrations — idempotent, run on every import
// ---------------------------------------------------------------------------

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_snapshots (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id  TEXT    NOT NULL,
      plan         TEXT,
      used         REAL    NOT NULL DEFAULT 0,
      limit_val    REAL    NOT NULL DEFAULT 0,
      reset_at     TEXT,
      pace_percent REAL,
      snapshot_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_credit_snapshots_provider_at
      ON credit_snapshots (provider_id, snapshot_at DESC);

    CREATE TABLE IF NOT EXISTS provider_configs (
      provider_id           TEXT    PRIMARY KEY,
      enabled               INTEGER NOT NULL DEFAULT 1,
      refresh_interval_mins INTEGER NOT NULL DEFAULT 15,
      config_json           TEXT    NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT    PRIMARY KEY,
      prompt       TEXT    NOT NULL,
      strategy     TEXT    NOT NULL DEFAULT 'auto',
      agent_id     TEXT,
      status       TEXT    NOT NULL DEFAULT 'pending',
      result_json  TEXT,
      created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at   TEXT,
      completed_at TEXT,
      duration_ms  INTEGER,
      error        TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_checks (
      agent_id   TEXT PRIMARY KEY,
      available  INTEGER NOT NULL,
      checked_at TEXT    NOT NULL
    );
  `);
}

runMigrations();
