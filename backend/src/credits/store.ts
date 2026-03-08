import { db } from "../db/sqlite";
import type { CreditSnapshot, ProviderConfig, ProviderId } from "./types";

// ---------------------------------------------------------------------------
// Row shapes returned by SQLite (all fields come back as JS primitives)
// ---------------------------------------------------------------------------

interface SnapshotRow {
  id: number;
  provider_id: string;
  plan: string | null;
  used: number;
  limit_val: number;
  reset_at: string | null;
  pace_percent: number | null;
  snapshot_at: string;
}

interface ConfigRow {
  provider_id: string;
  enabled: number;
  refresh_interval_mins: number;
  config_json: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function rowToSnapshot(row: SnapshotRow): CreditSnapshot {
  return {
    id: row.id,
    providerId: row.provider_id as ProviderId,
    plan: row.plan,
    used: row.used,
    limit: row.limit_val,
    resetAt: row.reset_at,
    pacePercent: row.pace_percent,
    snapshotAt: row.snapshot_at,
  };
}

function rowToConfig(row: ConfigRow): ProviderConfig {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(row.config_json) as Record<string, unknown>;
  } catch {
    // malformed JSON — fall back to empty object
  }
  return {
    providerId: row.provider_id as ProviderId,
    enabled: row.enabled === 1,
    refreshIntervalMins: row.refresh_interval_mins,
    config,
  };
}

// ---------------------------------------------------------------------------
// CreditStore — all interactions with the credit_snapshots and
// provider_configs tables go through this class.
// ---------------------------------------------------------------------------

export class CreditStore {
  // --- Prepared statements (created lazily for safety, reused for perf) ---

  private readonly insertSnapshot = db.prepare<void, [string, string | null, number, number, string | null, number | null]>(`
    INSERT INTO credit_snapshots (provider_id, plan, used, limit_val, reset_at, pace_percent)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  private readonly selectLatest = db.prepare<SnapshotRow, [string]>(`
    SELECT * FROM credit_snapshots
    WHERE provider_id = ?
    ORDER BY snapshot_at DESC
    LIMIT 1
  `);

  private readonly selectRecent = db.prepare<SnapshotRow, [string, number]>(`
    SELECT * FROM credit_snapshots
    WHERE provider_id = ?
    ORDER BY snapshot_at DESC
    LIMIT ?
  `);

  private readonly selectAllLatest = db.prepare<SnapshotRow, []>(`
    SELECT cs.*
    FROM credit_snapshots cs
    INNER JOIN (
      SELECT provider_id, MAX(snapshot_at) AS max_at
      FROM credit_snapshots
      GROUP BY provider_id
    ) latest
      ON cs.provider_id = latest.provider_id
     AND cs.snapshot_at  = latest.max_at
  `);

  private readonly selectConfig = db.prepare<ConfigRow, [string]>(`
    SELECT * FROM provider_configs WHERE provider_id = ?
  `);

  private readonly upsertConfig = db.prepare<void, [string, number, number, string]>(`
    INSERT INTO provider_configs (provider_id, enabled, refresh_interval_mins, config_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(provider_id) DO UPDATE SET
      enabled               = excluded.enabled,
      refresh_interval_mins = excluded.refresh_interval_mins,
      config_json           = excluded.config_json
  `);

  private readonly selectAllConfigs = db.prepare<ConfigRow, []>(`
    SELECT * FROM provider_configs
  `);

  // --- Public API ---

  saveSnapshot(snapshot: CreditSnapshot): void {
    this.insertSnapshot.run(
      snapshot.providerId,
      snapshot.plan,
      snapshot.used,
      snapshot.limit,
      snapshot.resetAt,
      snapshot.pacePercent,
    );
  }

  getLatestSnapshot(providerId: ProviderId): CreditSnapshot | null {
    const row = this.selectLatest.get(providerId);
    return row ? rowToSnapshot(row) : null;
  }

  getSnapshots(providerId: ProviderId, limit = 50): CreditSnapshot[] {
    return this.selectRecent.all(providerId, limit).map(rowToSnapshot);
  }

  getAllLatest(): CreditSnapshot[] {
    return this.selectAllLatest.all().map(rowToSnapshot);
  }

  getProviderConfig(providerId: ProviderId): ProviderConfig | null {
    const row = this.selectConfig.get(providerId);
    return row ? rowToConfig(row) : null;
  }

  setProviderConfig(
    config: Partial<ProviderConfig> & { providerId: ProviderId },
  ): void {
    // Merge with existing config to allow partial updates
    const existing = this.getProviderConfig(config.providerId);
    const merged: ProviderConfig = {
      providerId: config.providerId,
      enabled: config.enabled ?? existing?.enabled ?? true,
      refreshIntervalMins:
        config.refreshIntervalMins ?? existing?.refreshIntervalMins ?? 15,
      config: config.config ?? existing?.config ?? {},
    };
    this.upsertConfig.run(
      merged.providerId,
      merged.enabled ? 1 : 0,
      merged.refreshIntervalMins,
      JSON.stringify(merged.config),
    );
  }

  getAllProviderConfigs(): ProviderConfig[] {
    return this.selectAllConfigs.all().map(rowToConfig);
  }
}

export const creditStore = new CreditStore();
