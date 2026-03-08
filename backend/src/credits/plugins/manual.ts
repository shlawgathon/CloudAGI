import type { CreditPlugin, LineDefinition, ProbeResult } from "../types";

// ---------------------------------------------------------------------------
// Manual entry plugin — no API calls, user supplies data via the REST API
// ---------------------------------------------------------------------------

async function probe(): Promise<ProbeResult> {
  return {
    lines: [
      {
        type: "text",
        label: "Entry mode",
        value: "Manual — update via API",
      },
    ],
  };
}

const lineDefinitions: LineDefinition[] = [
  { type: "text", label: "Entry mode", scope: "overview", primaryOrder: 0 },
];

export const manualPlugin: CreditPlugin = {
  id: "manual",
  name: "Manual Entry",
  icon: "",
  brandColor: "#6B7280",
  links: [
    { label: "API docs", url: "/v1/credits/manual" },
  ],
  lines: lineDefinitions,
  probe,
};
