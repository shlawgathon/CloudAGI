import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CreditBalance,
  AgentInfo,
  TaskRecord,
  TaskStrategy,
  AppView,
} from "./types";
import { AppShell } from "./components/app-shell";
import { ProviderCard } from "./components/provider-card";
import { TaskInput } from "./components/task-input";
import { TaskList } from "./components/task-list";

// ------------------------------------------------------------------
// Mock data for development when the backend is unavailable
// ------------------------------------------------------------------

const MOCK_PROVIDERS: CreditBalance[] = [
  {
    id: "claude",
    provider: "Claude",
    plan: "Pro",
    color: "#D97706",
    status: "healthy",
    resetDate: "2026-03-22T00:00:00Z",
    lastRefreshed: new Date().toISOString(),
    metrics: [
      { name: "Opus Messages", used: 32, limit: 45, unit: "msgs" },
      { name: "Sonnet Messages", used: 180, limit: 500, unit: "msgs" },
      { name: "Tokens", used: 1_240_000, limit: 5_000_000, unit: "tokens" },
    ],
  },
  {
    id: "codex",
    provider: "Codex",
    plan: "Pro",
    color: "#10A37F",
    status: "healthy",
    resetDate: "2026-03-22T00:00:00Z",
    lastRefreshed: new Date().toISOString(),
    metrics: [
      { name: "API Requests", used: 420, limit: 1000, unit: "reqs" },
      { name: "Compute", used: 38, limit: 100, unit: "hrs" },
    ],
  },
  {
    id: "cursor",
    provider: "Cursor",
    plan: "Pro",
    color: "#00D4AA",
    status: "warning",
    resetDate: "2026-03-22T00:00:00Z",
    lastRefreshed: new Date().toISOString(),
    metrics: [
      { name: "Fast Requests", used: 420, limit: 500, unit: "reqs" },
      { name: "Slow Requests", used: 80, limit: 200, unit: "reqs" },
    ],
  },
  {
    id: "copilot",
    provider: "Copilot",
    plan: "Enterprise",
    color: "#6e40c9",
    status: "healthy",
    resetDate: "2026-03-22T00:00:00Z",
    lastRefreshed: new Date().toISOString(),
    metrics: [
      { name: "Completions", used: 2400, limit: 10000, unit: "reqs" },
      { name: "Chat Messages", used: 128, limit: 300, unit: "msgs" },
    ],
  },
  {
    id: "openrouter",
    provider: "OpenRouter",
    plan: "Credits",
    color: "#6366F1",
    status: "over-budget",
    resetDate: null,
    lastRefreshed: new Date().toISOString(),
    metrics: [
      { name: "Credits", used: 48, limit: 50, unit: "USD" },
    ],
  },
];

const MOCK_AGENTS: AgentInfo[] = [
  {
    id: "gpu-compute",
    name: "GPU Compute",
    provider: "Modal",
    color: "#D97706",
    capabilities: ["ML Training", "Inference", "Batch Processing"],
    pricePerTask: 1.0,
    currency: "USDC",
    status: "online",
  },
  {
    id: "ai-research",
    name: "AI Research",
    provider: "Exa",
    color: "#10A37F",
    capabilities: ["Neural Search", "Paper Discovery"],
    pricePerTask: 0.1,
    currency: "USDC",
    status: "online",
  },
  {
    id: "web-scraper",
    name: "Web Scraper",
    provider: "Apify",
    color: "#00D4AA",
    capabilities: ["Web Scraping", "Data Extraction"],
    pricePerTask: 0.2,
    currency: "USDC",
    status: "online",
  },
  {
    id: "code-review",
    name: "Code Review",
    provider: "Claude",
    color: "#6e40c9",
    capabilities: ["Code Analysis", "Security Review"],
    pricePerTask: 0.5,
    currency: "USDC",
    status: "online",
  },
  {
    id: "smart-search",
    name: "Smart Search",
    provider: "Multi-source",
    color: "#6366F1",
    capabilities: ["Aggregated Search", "Knowledge Discovery"],
    pricePerTask: 0.05,
    currency: "USDC",
    status: "online",
  },
];

const MOCK_TASKS: TaskRecord[] = [
  {
    id: "task-1",
    prompt: "Review the authentication middleware for security issues",
    strategy: "best-quality",
    status: "succeeded",
    assignedAgent: "Code Review",
    result:
      "Found 2 potential issues: missing rate limiting on login endpoint, JWT token not rotating on password change.",
    error: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    durationMs: 12400,
  },
  {
    id: "task-2",
    prompt: "Find recent papers on transformer architecture optimization",
    strategy: "auto",
    status: "running",
    assignedAgent: "AI Research",
    result: null,
    error: null,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    completedAt: null,
    durationMs: null,
  },
  {
    id: "task-3",
    prompt: "Scrape pricing data from competitor websites",
    strategy: "cheapest",
    status: "pending",
    assignedAgent: null,
    result: null,
    error: null,
    createdAt: new Date(Date.now() - 30000).toISOString(),
    completedAt: null,
    durationMs: null,
  },
];

// ------------------------------------------------------------------
// App component
// ------------------------------------------------------------------

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------------
// Backend → Frontend type mappers
// ------------------------------------------------------------------

interface BackendLine {
  type: string;
  label?: string;
  value?: string;
  used?: number;
  limit?: number;
  resetAt?: string;
  pacePercent?: number;
  variant?: string;
}

interface BackendProvider {
  providerId: string;
  name: string;
  brandColor: string;
  enabled: boolean;
  plan: string | null;
  lines: BackendLine[];
  lastRefresh: string | null;
  error: string | null;
}

interface BackendAgent {
  id: string;
  name: string;
  providerId: string;
  languages: string[];
  costPerTask: number;
  available: boolean;
}

interface BackendTask {
  id: string;
  prompt: string;
  strategy: string;
  agentId: string | null;
  status: string;
  result: unknown;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

function mapProvider(bp: BackendProvider): CreditBalance {
  const metrics: CreditBalance["metrics"] = bp.lines
    .filter((l) => l.type === "progress")
    .map((l) => ({
      name: l.label ?? "Usage",
      used: l.used ?? 0,
      limit: l.limit ?? 100,
      unit: (l.limit ?? 0) === 100 ? "%" : undefined,
    }));

  // Derive status from usage
  let status: CreditBalance["status"] = bp.enabled ? "healthy" : "disabled";
  if (bp.error && bp.lines.length === 0) {
    status = "disabled";
  } else if (metrics.length > 0) {
    const primary = metrics[0];
    const pct = primary.limit > 0 ? primary.used / primary.limit : 0;
    if (pct > 0.85) status = "over-budget";
    else if (pct > 0.6) status = "warning";
  }

  // Get reset date from first progress line
  const firstProgress = bp.lines.find((l) => l.type === "progress" && l.resetAt);
  const resetDate = firstProgress?.resetAt ?? null;

  return {
    id: bp.providerId,
    provider: bp.name,
    plan: bp.plan ?? (bp.error ? "Error" : "Unknown"),
    color: bp.brandColor,
    metrics,
    resetDate,
    status,
    lastRefreshed: bp.lastRefresh ?? new Date().toISOString(),
  };
}

function mapAgent(ba: BackendAgent): AgentInfo {
  const providerColors: Record<string, string> = {
    claude: "#D97706",
    codex: "#10A37F",
    openrouter: "#6366F1",
  };
  return {
    id: ba.id,
    name: ba.name,
    provider: ba.providerId,
    color: providerColors[ba.providerId] ?? "#888",
    capabilities: ba.languages,
    pricePerTask: ba.costPerTask,
    currency: "USDC",
    status: ba.available ? "online" : "offline",
  };
}

/**
 * Extract human-readable text from an NDJSON agent response.
 *
 * Agent responses (OpenCode, Claude Code, Codex) are streamed as newline-
 * delimited JSON with `step_start`, `text`, and `step_finish` events.
 * We parse each line, pull out the `part.text` from `type: "text"` entries,
 * and join them into a single readable string.  If parsing fails we fall
 * back to the raw string with any outer JSON wrapper stripped.
 */
function extractReadableOutput(raw: string): string {
  try {
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const textParts: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as {
          type?: string;
          part?: { text?: string };
        };
        if (parsed.type === "text" && typeof parsed.part?.text === "string") {
          textParts.push(parsed.part.text);
        }
      } catch {
        // Not valid JSON -- skip this line
      }
    }

    if (textParts.length > 0) {
      return textParts.join("").trim();
    }
  } catch {
    // Fall through to raw output
  }

  // Fallback: return the raw string as-is
  return raw.trim();
}

function mapTask(bt: BackendTask): TaskRecord {
  let result: string | null = null;

  if (bt.result != null) {
    if (typeof bt.result === "string") {
      result = extractReadableOutput(bt.result);
    } else {
      // bt.result is an object -- check for { success, output } wrapper
      const obj = bt.result as Record<string, unknown>;
      if (typeof obj.output === "string") {
        result = extractReadableOutput(obj.output);
      } else {
        result = JSON.stringify(bt.result, null, 2);
      }
    }
  }

  return {
    id: bt.id,
    prompt: bt.prompt,
    strategy: (bt.strategy as TaskStrategy) ?? "auto",
    status: (bt.status as TaskRecord["status"]) ?? "pending",
    assignedAgent: bt.agentId,
    result,
    error: bt.error,
    createdAt: bt.createdAt,
    completedAt: bt.completedAt,
    durationMs: bt.durationMs,
  };
}

export function App() {
  const [providers, setProviders] = useState<CreditBalance[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      const [creditsRes, agentsRes, tasksRes] = await Promise.allSettled([
        fetchJSON<{ providers: BackendProvider[] }>("/v1/credits"),
        fetchJSON<{ agents: BackendAgent[] }>("/v1/agents"),
        fetchJSON<{ tasks: BackendTask[] }>("/v1/tasks"),
      ]);

      // If all three fail, fall back to mock data
      const allFailed =
        creditsRes.status === "rejected" &&
        agentsRes.status === "rejected" &&
        tasksRes.status === "rejected";

      if (allFailed) {
        setProviders(MOCK_PROVIDERS);
        setAgents(MOCK_AGENTS);
        setTasks(MOCK_TASKS);
        setError(null);
      } else {
        if (creditsRes.status === "fulfilled") {
          setProviders(creditsRes.value.providers.map(mapProvider));
        } else {
          setProviders(MOCK_PROVIDERS);
        }

        if (agentsRes.status === "fulfilled") {
          setAgents(agentsRes.value.agents.map(mapAgent));
        } else {
          setAgents(MOCK_AGENTS);
        }

        if (tasksRes.status === "fulfilled") {
          setTasks(tasksRes.value.tasks.map(mapTask));
        } else {
          setTasks(MOCK_TASKS);
        }
        setError(null);
      }
    } catch {
      setProviders(MOCK_PROVIDERS);
      setAgents(MOCK_AGENTS);
      setTasks(MOCK_TASKS);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchAll();

    refreshInterval.current = setInterval(fetchAll, 60_000);
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchAll]);

  // Refresh a single provider
  const handleRefreshProvider = useCallback(async (id: string) => {
    try {
      const res = await fetchJSON<{ provider: BackendProvider }>(
        `/v1/credits/${id}/refresh`,
        { method: "POST" }
      );
      const mapped = mapProvider(res.provider);
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? mapped : p))
      );
    } catch {
      // Silently fail - the refresh button has its own cooldown
    }
  }, []);

  // Submit a task
  const handleSubmitTask = useCallback(
    async (prompt: string, strategy: TaskStrategy) => {
      try {
        const res = await fetchJSON<{ task: BackendTask }>("/v1/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, strategy }),
        });
        setTasks((prev) => [mapTask(res.task), ...prev]);
      } catch {
        // Create a mock task on failure for demo purposes
        const mockTask: TaskRecord = {
          id: `task-${Date.now()}`,
          prompt,
          strategy,
          status: "pending",
          assignedAgent: null,
          result: null,
          error: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          durationMs: null,
        };
        setTasks((prev) => [mockTask, ...prev]);
      }
    },
    []
  );

  // Select provider handler
  const handleSelectProvider = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // View change handler
  const handleSelectView = useCallback((newView: AppView) => {
    setView(newView);
    if (newView !== "detail") {
      setSelectedId(null);
    }
  }, []);

  // Get selected provider
  const selectedProvider = providers.find((p) => p.id === selectedId) ?? null;

  // Render content based on view
  function renderContent() {
    if (loading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-muted px-8">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-4 opacity-50"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium mb-1">Connection Error</p>
          <p className="text-xs text-center max-w-sm">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchAll();
            }}
            className="mt-4 px-4 py-2 text-xs bg-accent text-background rounded-lg
                       hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (view === "tasks") {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Recent Tasks
          </h2>
          <TaskList tasks={tasks} />
        </div>
      );
    }

    if (view === "detail" && selectedProvider) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {selectedProvider.provider}
          </h2>
          <ProviderCard
            provider={selectedProvider}
            onRefresh={handleRefreshProvider}
          />

          {/* Agent info for this provider */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Available Agents
            </h3>
            <div className="space-y-2">
              {agents
                .filter(
                  (a) =>
                    a.provider.toLowerCase() ===
                    selectedProvider.id.toLowerCase()
                )
                .map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border
                               bg-card hover:bg-card-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="text-sm text-text-primary">
                        {agent.name}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          agent.status === "online"
                            ? "bg-success/10 text-success"
                            : agent.status === "degraded"
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted font-mono">
                      ${agent.pricePerTask} {agent.currency}
                    </span>
                  </div>
                ))}
              {agents.filter(
                (a) =>
                  a.provider.toLowerCase() ===
                  selectedProvider.provider.toLowerCase()
              ).length === 0 && (
                <p className="text-xs text-text-muted">
                  No agents for this provider
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Overview
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Agent Economy
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {providers.length} providers &middot; {agents.length} agents
              online
            </p>
          </div>

          {/* Total usage summary */}
          <div className="flex items-center gap-4">
            {["healthy", "warning", "over-budget"].map((status) => {
              const count = providers.filter((p) => p.status === status).length;
              if (count === 0) return null;
              const color =
                status === "healthy"
                  ? "text-success"
                  : status === "warning"
                    ? "text-warning"
                    : "text-danger";
              const label =
                status === "over-budget" ? "over budget" : status;
              return (
                <span
                  key={status}
                  className={`text-xs ${color} flex items-center gap-1`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
                  {count} {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Provider cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onRefresh={handleRefreshProvider}
            />
          ))}
        </div>

        {/* Recent tasks preview */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Recent Tasks
            </h2>
            <button
              type="button"
              onClick={() => handleSelectView("tasks")}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              View all
            </button>
          </div>
          <TaskList tasks={tasks.slice(0, 5)} />
        </div>
      </div>
    );
  }

  return (
    <AppShell
      providers={providers}
      selectedId={selectedId}
      view={view}
      onSelectProvider={handleSelectProvider}
      onSelectView={handleSelectView}
      footer={
        <TaskInput agents={agents} onSubmit={handleSubmitTask} />
      }
    >
      {renderContent()}
    </AppShell>
  );
}

// ------------------------------------------------------------------
// Loading skeleton
// ------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="p-6">
      {/* Title skeleton */}
      <div className="mb-6">
        <div className="skeleton h-6 w-48 mb-2" />
        <div className="skeleton h-4 w-32" />
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="skeleton w-3 h-3 rounded-full" />
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-4 w-12 rounded-full" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5">
                  <div className="skeleton h-3.5 w-28" />
                  <div className="skeleton h-3.5 w-20" />
                </div>
                <div className="skeleton h-3 w-full rounded-full" />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <div className="skeleton h-3.5 w-24" />
                  <div className="skeleton h-3.5 w-16" />
                </div>
                <div className="skeleton h-3 w-full rounded-full" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="skeleton h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
