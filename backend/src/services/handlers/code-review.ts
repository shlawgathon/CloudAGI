import { registerService } from "../registry";
import type { ServiceResult } from "../registry";
import { config } from "../../config";

async function callLLM(prompt: string): Promise<string> {
  if (config.openrouter.apiKey) {
    // OpenRouter (OpenAI-compatible API)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openrouter.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openrouter.model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices?.[0]?.message?.content || "";
  }

  if (config.anthropic.apiKey) {
    // Direct Anthropic API
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
      throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    return data.content.find((c) => c.type === "text")?.text || "";
  }

  throw new Error("No LLM API key configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)");
}

async function handler(body: Record<string, unknown>): Promise<ServiceResult> {
  const code = body.code as string | undefined;
  const language = (body.language as string) || "typescript";
  const focus = (body.focus as string[]) || ["bugs", "security", "performance"];

  if (!code?.trim()) {
    return { success: false, error: "code is required" };
  }

  if (!config.openrouter.apiKey && !config.anthropic.apiKey) {
    return { success: false, error: "No LLM API key configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)" };
  }

  const sanitizedCode = code
    .replace(/<user_code>/gi, "")
    .replace(/<\/user_code>/gi, "")
    .replace(/<system>/gi, "")
    .replace(/<\/system>/gi, "");

  const prompt = `Review the ${language} code provided below. Focus on: ${focus.join(", ")}.

Return a JSON object with:
- "issues": array of { "severity": "critical"|"warning"|"info", "line": number|null, "message": string, "suggestion": string }
- "summary": brief overall assessment
- "score": 1-10 quality score

<user_code>
\`\`\`${language}
${sanitizedCode}
\`\`\`
</user_code>`;

  try {
    const text = await callLLM(prompt);

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
    "CloudAGI Code Review — AI-powered security and quality analysis. Submit any code snippet and get a structured JSON report with bug detection, security vulnerability scanning, performance issues, and style suggestions. Each finding includes severity level, line number, and actionable fix suggestions. Powered by Claude Sonnet 4.6.",
  category: "development",
  priceLabel: "0.50 USDC",
  priceAmount: "0.50",
  priceCurrency: "USDC",
  tags: ["code-review", "security", "cloud", "cloudagi", "analysis", "ai", "api", "agent", "marketplace"],
  handler,
});
