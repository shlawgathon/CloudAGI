import { useState, useCallback } from "react";
import type { TaskRecord } from "../types";
import { ScrollFade } from "./scroll-fade";

interface TaskListProps {
  tasks: TaskRecord[];
}

const statusConfig: Record<
  TaskRecord["status"],
  { icon: string; color: string; animate?: string }
> = {
  pending: { icon: "pending", color: "text-text-muted" },
  running: { icon: "running", color: "text-accent", animate: "animate-pulse" },
  succeeded: { icon: "succeeded", color: "text-success" },
  failed: { icon: "failed", color: "text-danger" },
  routing: { icon: "routing", color: "text-warning", animate: "animate-pulse" },
  canceled: { icon: "canceled", color: "text-text-muted" },
};

function StatusIcon({
  status,
}: {
  status: TaskRecord["status"];
}) {
  const config = statusConfig[status];

  if (status === "pending") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={config.color}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  if (status === "running") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`${config.color} ${config.animate ?? ""}`}
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );
  }

  if (status === "succeeded") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={config.color}
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  if (status === "routing") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${config.color} ${config.animate ?? ""}`}
      >
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    );
  }

  if (status === "canceled") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={config.color}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    );
  }

  // failed
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={config.color}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/** A small "Copy" button that copies text to the clipboard. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Don't toggle the parent expand/collapse
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [text],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded
                 border border-border bg-background text-text-muted
                 hover:bg-card-hover hover:text-text-secondary transition-colors"
      aria-label="Copy result to clipboard"
    >
      {copied ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

/**
 * Represents a parsed segment of agent output -- either plain text or a fenced
 * code block with an optional language tag.
 */
interface ResultSegment {
  kind: "text" | "code";
  language?: string;
  content: string;
}

/**
 * Parse a result string into segments of plain text and fenced code blocks.
 *
 * Detects markdown-style ``` fences with optional language identifiers and
 * splits them into separate segments so they can be rendered with distinct
 * styling.
 */
function parseResultSegments(result: string): ResultSegment[] {
  const segments: ResultSegment[] = [];
  // Match ```lang\n...\n``` blocks (the language tag is optional)
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(result)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      const text = result.slice(lastIndex, match.index).trim();
      if (text.length > 0) {
        segments.push({ kind: "text", content: text });
      }
    }

    segments.push({
      kind: "code",
      language: match[1] || undefined,
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last code block
  if (lastIndex < result.length) {
    const text = result.slice(lastIndex).trim();
    if (text.length > 0) {
      segments.push({ kind: "text", content: text });
    }
  }

  return segments;
}

/** Render a parsed result with proper code block styling. */
function FormattedResult({ result }: { result: string }) {
  const segments = parseResultSegments(result);

  // If parsing produced no segments (shouldn't happen), fall back to plain text
  if (segments.length === 0) {
    return (
      <pre className="text-text-secondary bg-background rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap text-xs">
        {result}
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.kind === "code") {
          return (
            <div key={i} className="relative group">
              {seg.language && (
                <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] text-text-muted bg-white/5 rounded-bl-md rounded-tr-md font-mono">
                  {seg.language}
                </div>
              )}
              <pre
                className={`bg-[#1a1a2e] text-emerald-300 rounded-md p-3 overflow-x-auto font-mono whitespace-pre text-xs leading-relaxed${
                  seg.language ? ` language-${seg.language}` : ""
                }`}
              >
                {seg.content}
              </pre>
            </div>
          );
        }

        // Plain text segment
        return (
          <p
            key={i}
            className="text-text-secondary whitespace-pre-wrap text-xs leading-relaxed"
          >
            {seg.content}
          </p>
        );
      })}
    </div>
  );
}

export function TaskList({ tasks }: TaskListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-3 opacity-50"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <p className="text-sm">No tasks yet</p>
        <p className="text-xs mt-1">Submit a task to get started</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
        <div className="space-y-1">
          {tasks.map((task) => {
            const isExpanded = expandedId === task.id;

            return (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : task.id)
                }
                className="w-full text-left rounded-lg border border-border bg-card p-3
                           hover:bg-card-hover hover:border-border-hover
                           transition-all duration-150 cursor-pointer
                           focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {/* Task row */}
                <div className="flex items-center gap-3">
                  <StatusIcon status={task.status} />
                  <span className="flex-1 text-sm text-text-primary truncate">
                    {task.prompt}
                  </span>
                  {task.assignedAgent && (
                    <span className="text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                      {task.assignedAgent}
                    </span>
                  )}
                  <span className="text-xs text-text-muted font-mono shrink-0">
                    {formatDuration(task.durationMs)}
                  </span>
                  <span className="text-xs text-text-muted shrink-0">
                    {formatTimeAgo(task.createdAt)}
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="text-text-muted">Prompt: </span>
                        <span className="text-text-secondary">{task.prompt}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Strategy: </span>
                        <span className="text-text-secondary">{task.strategy}</span>
                      </div>
                      {task.result && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-text-muted">Result: </span>
                            <CopyButton text={task.result} />
                          </div>
                          <FormattedResult result={task.result} />
                        </div>
                      )}
                      {task.error && (
                        <div>
                          <span className="text-danger">Error: </span>
                          <pre className="mt-1 text-danger/80 bg-danger/5 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap">
                            {task.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <ScrollFade />
    </div>
  );
}
