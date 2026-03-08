// ---------------------------------------------------------------------------
// Task Queue — SQLite-backed store
// ---------------------------------------------------------------------------

import { db } from "../db/sqlite";
import type { AgentId, AgentResult, RoutingStrategy } from "../agents/types";
import type { TaskInput, TaskRecord, TaskStatus, RoutingScore } from "./types";

// ---------------------------------------------------------------------------
// Row shape coming out of SQLite
// ---------------------------------------------------------------------------

interface TaskRow {
  id: string;
  prompt: string;
  strategy: string;
  preferred_agent: string | null;
  working_directory: string | null;
  max_turns: number | null;
  agent_id: string | null;
  status: string;
  result_json: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  routing_decision_json: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToRecord(row: TaskRow): TaskRecord {
  let result: AgentResult | null = null;
  if (row.result_json) {
    try {
      result = JSON.parse(row.result_json) as AgentResult;
    } catch {
      // Corrupted row — treat as null
    }
  }

  let routingDecision: TaskRecord["routingDecision"] | undefined;
  if (row.routing_decision_json) {
    try {
      routingDecision = JSON.parse(row.routing_decision_json) as {
        scores: RoutingScore[];
        selectedAgent: string;
        reason: string;
      };
    } catch {
      // ignore
    }
  }

  return {
    id: row.id,
    prompt: row.prompt,
    strategy: row.strategy as RoutingStrategy,
    agentId: (row.agent_id as AgentId) ?? null,
    status: row.status as TaskStatus,
    result,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    error: row.error,
    routingDecision,
    preferredAgent: (row.preferred_agent as AgentId) ?? undefined,
    workingDirectory: row.working_directory ?? undefined,
    maxTurns: row.max_turns ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Ensure routing_decision_json column exists (additive migration)
// ---------------------------------------------------------------------------

const additiveMigrations = [
  `ALTER TABLE tasks ADD COLUMN routing_decision_json TEXT;`,
  `ALTER TABLE tasks ADD COLUMN preferred_agent TEXT;`,
  `ALTER TABLE tasks ADD COLUMN working_directory TEXT;`,
  `ALTER TABLE tasks ADD COLUMN max_turns INTEGER;`,
];

for (const migration of additiveMigrations) {
  try {
    db.exec(migration);
  } catch {
    // Column already exists — fine
  }
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmtInsert = db.prepare<TaskRow, [string, string, string, string | null, string | null, number | null]>(`
  INSERT INTO tasks (id, prompt, strategy, preferred_agent, working_directory, max_turns)
  VALUES (?, ?, ?, ?, ?, ?)
  RETURNING *
`);

const stmtGetById = db.prepare<TaskRow, [string]>(`
  SELECT *, routing_decision_json FROM tasks WHERE id = ?
`);

const stmtList = db.prepare<TaskRow, [number]>(`
  SELECT *, routing_decision_json FROM tasks
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtGetNextPending = db.prepare<TaskRow, []>(`
  SELECT *, routing_decision_json FROM tasks
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
`);

const stmtGetRunningCount = db.prepare<{ cnt: number }, []>(`
  SELECT COUNT(*) AS cnt FROM tasks WHERE status = 'running'
`);

// ---------------------------------------------------------------------------
// TaskStore
// ---------------------------------------------------------------------------

export class TaskStore {
  /** Insert a new task and return the created record */
  create(input: TaskInput): TaskRecord {
    const id = crypto.randomUUID();
    const strategy: RoutingStrategy = input.strategy ?? "auto";
    const row = stmtInsert.get(
      id,
      input.prompt,
      strategy,
      input.preferredAgent ?? null,
      input.workingDirectory ?? null,
      input.maxTurns ?? null
    );
    if (!row) {
      throw new Error("Failed to insert task — no row returned");
    }
    return rowToRecord(row);
  }

  /** Retrieve a single task by ID */
  get(id: string): TaskRecord | null {
    const row = stmtGetById.get(id);
    return row ? rowToRecord(row) : null;
  }

  /** List recent tasks, newest first */
  list(limit = 100): TaskRecord[] {
    return stmtList.all(limit).map(rowToRecord);
  }

  /**
   * Update status and optional fields on a task.
   * Uses a dynamic UPDATE statement so only provided fields are changed.
   */
  updateStatus(
    id: string,
    status: TaskStatus,
    updates?: Partial<TaskRecord>
  ): void {
    const fields: string[] = ["status = ?"];
    const values: unknown[] = [status];

    if (updates?.agentId !== undefined) {
      fields.push("agent_id = ?");
      values.push(updates.agentId);
    }
    if (updates?.startedAt !== undefined) {
      fields.push("started_at = ?");
      values.push(updates.startedAt);
    }
    if (updates?.completedAt !== undefined) {
      fields.push("completed_at = ?");
      values.push(updates.completedAt);
    }
    if (updates?.durationMs !== undefined) {
      fields.push("duration_ms = ?");
      values.push(updates.durationMs);
    }
    if (updates?.error !== undefined) {
      fields.push("error = ?");
      values.push(updates.error);
    }
    if (updates?.result !== undefined) {
      fields.push("result_json = ?");
      values.push(JSON.stringify(updates.result));
    }
    if (updates?.routingDecision !== undefined) {
      fields.push("routing_decision_json = ?");
      values.push(JSON.stringify(updates.routingDecision));
    }

    values.push(id);
    // values contains only string | number | null entries at runtime.
    // bun:sqlite Statement.run() does not accept a pre-built array directly —
    // we must spread. The type system can't verify the spread here, so we
    // cast the statement to any for this one dynamic call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`) as any).run(
      ...values
    );
  }

  /** Dequeue the oldest pending task (FIFO) */
  getNextPending(): TaskRecord | null {
    const row = stmtGetNextPending.get();
    return row ? rowToRecord(row) : null;
  }

  /** Count tasks currently in "running" state */
  getRunningCount(): number {
    return stmtGetRunningCount.get()?.cnt ?? 0;
  }
}

export const taskStore = new TaskStore();
