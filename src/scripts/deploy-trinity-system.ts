import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config";

async function main() {
  if (!config.trinity.baseUrl || !config.trinity.apiKey) {
    throw new Error("TRINITY_BASE_URL and TRINITY_API_KEY are required");
  }

  const manifestPath = resolve("workflows", "trinity", "cloudagi-fixed-system.yaml");
  const manifest = await readFile(manifestPath, "utf8");

  const response = await fetch(`${config.trinity.baseUrl}/api/systems/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.trinity.apiKey}`
    },
    body: JSON.stringify({
      manifest,
      dry_run: false
    })
  });

  if (!response.ok) {
    throw new Error(`Unable to deploy Trinity system: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
