import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const code = body.code as string | undefined;
  const language = (body.language as string) || "typescript";
  const focus = (body.focus as string[]) || ["bugs", "security", "performance"];

  if (!code?.trim()) {
    return { success: false, error: "code is required" };
  }

  if (!config.anthropic.apiKey) {
    return { success: false, error: "Anthropic API key not configured" };
  }

  const prompt = `Review this ${language} code. Focus on: ${focus.join(", ")}.

Return a JSON object with:
- "issues": array of { "severity": "critical"|"warning"|"info", "line": number|null, "message": string, "suggestion": string }
- "summary": brief overall assessment
- "score": 1-10 quality score

Code:
\`\`\`${language}
${code}
\`\`\``;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.anthropic.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Anthropic API error ${response.status}: ${errText}` };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = data.content.find((c) => c.type === "text")?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, data: parsed };
      } catch {
        // Fall through to raw text
      }
    }

    return { success: true, data: { raw: text } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

registerService({
  id: "code-review",
  name: "Code Review",
  description:
    "AI-powered code review using Claude. Analyzes code for bugs, security vulnerabilities, performance issues, and style. Returns structured findings with severity levels and suggestions.",
  category: "development",
  priceLabel: "0.50 USDC",
  priceAmount: "0.50",
  priceCurrency: "USDC",
  tags: ["code-review", "analysis", "security", "bugs", "ai", "claude"],
  handler,
});
