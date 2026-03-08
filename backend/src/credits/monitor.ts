import { creditStore } from "./store";
import type { CreditBalance, CreditPlugin, CreditSnapshot, ProviderId } from "./types";

// Plugin implementations
import { claudePlugin } from "./plugins/claude";
import { codexPlugin } from "./plugins/codex";
import { copilotPlugin } from "./plugins/copilot";
import { cursorPlugin } from "./plugins/cursor";
import { manualPlugin } from "./plugins/manual";
import { openrouterPlugin } from "./plugins/openrouter";
import { ampPlugin } from "./plugins/amp";
import { windsurfPlugin } from "./plugins/windsurf";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum seconds between forced refreshes for the same provider */
const COOLDOWN_SECS = 5 * 60; // 5 minutes

/** Milliseconds to stagger start of each provider's polling loop */
const STAGGER_MS = 2_000;

/** Default polling interval in milliseconds */
const DEFAULT_INTERVAL_MS = 15 * 60 * 1_000; // 15 minutes

// ---------------------------------------------------------------------------
// CreditMonitor — manages the polling lifecycle for all registered plugins
// ---------------------------------------------------------------------------

export class CreditMonitor {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastRefresh = new Map<string, number>();
  private readonly latestBalances = new Map<string, CreditBalance>();
  private readonly plugins = new Map<string, CreditPlugin>();

  constructor() {
    // Register all built-in plugins
    const all: CreditPlugin[] = [
      claudePlugin,
      codexPlugin,
      cursorPlugin,
      copilotPlugin,
      openrouterPlugin,
      ampPlugin,
      windsurfPlugin,
      manualPlugin,
    ];
    for (const plugin of all) {
      this.plugins.set(plugin.id, plugin);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    let index = 0;
    for (const [providerId, plugin] of this.plugins) {
      const providerConfig = creditStore.getProviderConfig(plugin.id);
      if (providerConfig && !providerConfig.enabled) {
        continue; // skip disabled providers
      }

      const intervalMs =
        (providerConfig?.refreshIntervalMins ?? 15) * 60 * 1_000;

      const jitter = index * STAGGER_MS;

      // Stagger the initial poll using a one-shot timeout, then set a recurring interval
      const startTimeout = setTimeout(() => {
        void this.refreshProvider(providerId);

        const timer = setInterval(() => {
          void this.refreshProvider(providerId);
        }, intervalMs);

        this.timers.set(providerId, timer);
      }, jitter);

      // Store the timeout handle so stop() can clear it if start() → stop() is
      // called before the timeout fires.  We abuse the Map to hold both types.
      this.timers.set(`${providerId}:init`, startTimeout as unknown as ReturnType<typeof setInterval>);

      index++;
    }
  }

  stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
      clearTimeout(timer as unknown as ReturnType<typeof setTimeout>);
    }
    this.timers.clear();
  }

  // ---------------------------------------------------------------------------
  // Refresh logic
  // ---------------------------------------------------------------------------

  async refreshProvider(
    providerId: string,
    force = false,
  ): Promise<CreditBalance> {
    const plugin = this.plugins.get(providerId);
    if (!plugin) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // Cooldown check
    if (!force) {
      const last = this.lastRefresh.get(providerId) ?? 0;
      const elapsedSecs = (Date.now() - last) / 1_000;
      if (elapsedSecs < COOLDOWN_SECS) {
        const cached = this.latestBalances.get(providerId);
        if (cached) return cached;
      }
    }

    // Determine enabled state from config (default: enabled)
    const providerConfig = creditStore.getProviderConfig(plugin.id);
    const enabled = providerConfig?.enabled ?? true;

    // Run the probe
    let probeResult;
    try {
      probeResult = await plugin.probe();
    } catch (err) {
      probeResult = {
        lines: [] as CreditBalance["lines"],
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const now = new Date().toISOString();

    // Persist snapshot — extract primary progress line for summary storage
    const primaryProgress = probeResult.lines.find((l) => l.type === "progress");
    const snapshot: CreditSnapshot = {
      providerId: plugin.id as ProviderId,
      plan: probeResult.plan ?? null,
      used: primaryProgress?.type === "progress" ? primaryProgress.used : 0,
      limit: primaryProgress?.type === "progress" ? primaryProgress.limit : 0,
      resetAt: primaryProgress?.type === "progress" ? (primaryProgress.resetAt ?? null) : null,
      pacePercent:
        primaryProgress?.type === "progress" ? (primaryProgress.pacePercent ?? null) : null,
      snapshotAt: now,
    };

    try {
      creditStore.saveSnapshot(snapshot);
    } catch {
      // Non-fatal: persistence failure should not break the balance return
    }

    const balance: CreditBalance = {
      providerId: plugin.id as ProviderId,
      name: plugin.name,
      icon: plugin.icon,
      brandColor: plugin.brandColor,
      enabled,
      plan: probeResult.plan ?? null,
      lines: probeResult.lines,
      lastRefresh: now,
      error: probeResult.error ?? null,
    };

    this.latestBalances.set(providerId, balance);
    this.lastRefresh.set(providerId, Date.now());

    return balance;
  }

  async refreshAll(): Promise<CreditBalance[]> {
    const results = await Promise.allSettled(
      [...this.plugins.keys()].map((id) => this.refreshProvider(id, true)),
    );

    return results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;

      const id = [...this.plugins.keys()][i];
      const plugin = this.plugins.get(id)!;
      const providerConfig = creditStore.getProviderConfig(plugin.id);
      return {
        providerId: plugin.id as ProviderId,
        name: plugin.name,
        icon: plugin.icon,
        brandColor: plugin.brandColor,
        enabled: providerConfig?.enabled ?? true,
        plan: null,
        lines: [],
        lastRefresh: null,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      } satisfies CreditBalance;
    });
  }

  // ---------------------------------------------------------------------------
  // Read-only accessors
  // ---------------------------------------------------------------------------

  getBalance(providerId: string): CreditBalance | null {
    return this.latestBalances.get(providerId) ?? null;
  }

  getAllBalances(): CreditBalance[] {
    return [...this.latestBalances.values()];
  }

  /**
   * Returns how many seconds remain before the given provider can be
   * refreshed again (without force=true).  Returns 0 if already eligible.
   */
  getCooldownRemaining(providerId: string): number {
    const last = this.lastRefresh.get(providerId) ?? 0;
    const elapsed = (Date.now() - last) / 1_000;
    return Math.max(0, COOLDOWN_SECS - elapsed);
  }

  /** Expose plugin metadata (useful for building UI without probing) */
  getPlugins(): CreditPlugin[] {
    return [...this.plugins.values()];
  }

  /** Register a custom plugin at runtime (useful for testing / extensions) */
  registerPlugin(plugin: CreditPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }
}

export const creditMonitor = new CreditMonitor();

// Note: start() is called from index.ts server startup — no auto-start here
