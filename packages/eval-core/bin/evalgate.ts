#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { runEvaluation, writeReportJson } from "../src/index.js";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const command = process.argv[2];

  if (command === "run") {
    const dataset = getArg("--dataset");
    const provider = getArg("--provider") ?? "openai";
    const model = getArg("--model") ?? "gpt-4.1-mini";
    const apiKey = getArg("--api-key");
    const out = getArg("--out");
    const prompt = getArg("--prompt") ?? "Classify the input into the configured schema.";

    if (!dataset || !apiKey) {
      throw new Error("Missing --dataset or --api-key");
    }

    const report = await runEvaluation({
      runId: "cli_run",
      projectId: "cli_project",
      datasetPath: dataset,
      apiKey,
      runConfig: {
        promptText: prompt,
        modelProvider: provider,
        modelName: model,
        schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["billing", "refund", "cancellation", "technical", "unknown"]
            }
          },
          required: ["category"],
          additionalProperties: false
        },
        thresholds: {}
      }
    });

    if (out) {
      await mkdir(path.dirname(out), { recursive: true });
      await writeReportJson(out, report.report);
    } else {
      process.stdout.write(`${JSON.stringify(report.report, null, 2)}\n`);
    }

    return;
  }

  throw new Error("Usage: evalgate run --dataset <path> --api-key <key> [--provider openai] [--model gpt-4.1-mini]");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
