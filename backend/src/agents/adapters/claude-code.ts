// ---------------------------------------------------------------------------
// Claude Code adapter
// ---------------------------------------------------------------------------

import type { AgentAdapter } from "./adapter";
import type { AgentCapability, AgentInvocation, AgentResult } from "../types";
import { executeCommand } from "../executor";

const CAPABILITY: AgentCapability = {
  id: "claude-code",
  name: "Claude Code",
  providerId: "claude",
  languages: [
    "typescript",
    "javascript",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
  ],
  maxPromptLength: 100_000,
  costPerTask: 0.5,
  speedScore: 0.7,
  qualityScore: 0.95,
};

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly capability: AgentCapability = CAPABILITY;

  async checkAvailability(): Promise<boolean> {
    const result = await executeCommand(["which", "claude"], { timeout: 5_000 });
    return result.exitCode === 0;
  }

  async execute(invocation: AgentInvocation): Promise<AgentResult> {
    const cmd: string[] = [
      "claude",
      "-p",
      invocation.prompt,
      "--output-format",
      "json",
      "--max-turns",
      String(invocation.maxTurns ?? 25),
    ];

    const result = await executeCommand(cmd, {
      cwd: invocation.workingDirectory,
    });

    const success = result.exitCode === 0;

    // Attempt JSON parse when caller requested it
    let output = result.stdout;
    if (invocation.outputFormat === "json" && success) {
      try {
        // Validate the output is parseable JSON
        JSON.parse(output);
      } catch {
        // Return raw output if it doesn't parse
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
    // Rough heuristic: ~4 chars per token, ~$0.015 per 1k tokens
    const tokens = prompt.length / 4;
    return (tokens / 1_000) * 0.015 * this.capability.costPerTask;
  }
}
