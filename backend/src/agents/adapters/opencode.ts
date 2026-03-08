// ---------------------------------------------------------------------------
// OpenCode adapter
// ---------------------------------------------------------------------------

import type { AgentAdapter } from "./adapter";
import type { AgentCapability, AgentInvocation, AgentResult } from "../types";
import { executeCommand } from "../executor";

const CAPABILITY: AgentCapability = {
  id: "opencode",
  name: "OpenCode",
  providerId: "openrouter",
  languages: ["typescript", "javascript", "python", "go"],
  maxPromptLength: 32_000,
  costPerTask: 0.2,
  speedScore: 0.9,
  qualityScore: 0.7,
};

export class OpenCodeAdapter implements AgentAdapter {
  readonly capability: AgentCapability = CAPABILITY;

  async checkAvailability(): Promise<boolean> {
    const result = await executeCommand(["which", "opencode"], {
      timeout: 5_000,
    });
    return result.exitCode === 0;
  }

  async execute(invocation: AgentInvocation): Promise<AgentResult> {
    // opencode run "message" --format json
    const cmd: string[] = [
      "opencode",
      "run",
      invocation.prompt,
      "--format",
      "json",
    ];

    const result = await executeCommand(cmd, {
      cwd: invocation.workingDirectory,
    });

    const success = result.exitCode === 0;

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
    return (tokens / 1_000) * 0.008 * this.capability.costPerTask;
  }
}
