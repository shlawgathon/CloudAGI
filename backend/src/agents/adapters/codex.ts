// ---------------------------------------------------------------------------
// Codex (OpenAI) adapter
// ---------------------------------------------------------------------------

import type { AgentAdapter } from "./adapter";
import type { AgentCapability, AgentInvocation, AgentResult } from "../types";
import { executeCommand } from "../executor";

const CAPABILITY: AgentCapability = {
  id: "codex",
  name: "Codex",
  providerId: "codex",
  languages: ["typescript", "javascript", "python", "go", "rust"],
  maxPromptLength: 32_000,
  costPerTask: 0.3,
  speedScore: 0.8,
  qualityScore: 0.8,
};

export class CodexAdapter implements AgentAdapter {
  readonly capability: AgentCapability = CAPABILITY;

  async checkAvailability(): Promise<boolean> {
    const result = await executeCommand(["which", "codex"], { timeout: 5_000 });
    return result.exitCode === 0;
  }

  async execute(invocation: AgentInvocation): Promise<AgentResult> {
    // codex exec "prompt" --full-auto
    const cmd: string[] = [
      "codex",
      "exec",
      invocation.prompt,
      "--full-auto",
    ];

    const result = await executeCommand(cmd, {
      cwd: invocation.workingDirectory,
    });

    const success = result.exitCode === 0;

    // Attempt JSON parse when output looks like JSON
    let output = result.stdout;
    if (success && output.trimStart().startsWith("{")) {
      try {
        JSON.parse(output);
      } catch {
        // Keep raw output
      }
    }

    return {
      success,
      output,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      error: success ? undefined : result.stderr || "Non-zero exit code",
    };
  }

  estimateCost(prompt: string): number {
    const tokens = prompt.length / 4;
    return (tokens / 1_000) * 0.01 * this.capability.costPerTask;
  }
}
