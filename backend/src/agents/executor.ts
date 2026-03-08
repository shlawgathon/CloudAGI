// ---------------------------------------------------------------------------
// executeCommand — shared Bun.spawn wrapper with timeout and output capture
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * Spawns an external process, captures its output, and enforces a timeout.
 * Never throws — errors are returned as a non-zero exitCode + stderr message.
 */
export async function executeCommand(
  args: string[],
  options?: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
  }
): Promise<CommandResult> {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const startedAt = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const proc = Bun.spawn(args, {
      cwd: options?.cwd,
      env: {
        ...process.env,
        ...options?.env,
        // Unset CLAUDECODE to allow nested Claude Code invocations from the backend
        CLAUDECODE: undefined,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Race process exit against the abort signal
    const exitCodePromise = proc.exited;
    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        try {
          proc.kill();
        } catch {
          // process may have already exited
        }
        reject(new Error(`Process timed out after ${timeoutMs}ms`));
      });
    });

    await Promise.race([exitCodePromise, abortPromise]);

    clearTimeout(timer);

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    return {
      stdout,
      stderr,
      exitCode: proc.exitCode ?? 0,
      durationMs: performance.now() - startedAt,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    return {
      stdout: "",
      stderr: message,
      exitCode: 1,
      durationMs: performance.now() - startedAt,
    };
  }
}
