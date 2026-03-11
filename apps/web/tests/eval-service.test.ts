import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  dataDir: process.env.EVALGATE_DATA_DIR,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

afterEach(async () => {
  vi.resetModules();
  process.env.EVALGATE_DATA_DIR = originalEnv.dataDir;
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.supabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.supabaseKey;
});

async function useTempDataDir() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "evalgate-web-test-"));
  process.env.EVALGATE_DATA_DIR = tempDir;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  vi.resetModules();
  return {
    tempDir,
    async cleanup() {
      await rm(tempDir, { recursive: true, force: true });
    }
  };
}

describe("processRun", () => {
  it("does not duplicate artifacts when a completed run is processed again", async () => {
    const sandbox = await useTempDataDir();

    try {
      const database = await import("../lib/server/database");
      const { processRun } = await import("../lib/server/eval-service");

      const project = await database.createProject({
        ownerId: "user_1",
        ownerEmail: "user@example.com",
        name: "EvalGate",
        description: "Idempotency test",
        templateType: "custom"
      });
      const dataset = await database.createDataset({
        projectId: project.id,
        filename: "cases.jsonl",
        contents: JSON.stringify({
          id: "case_001",
          input: { ticket_text: "Customer says they were double charged" },
          expected: { category: "billing" }
        }),
        rowCount: 1
      });
      const runConfig = await database.createRunConfig({
        projectId: project.id,
        name: "mock-config",
        promptText: "Classify the support ticket.",
        modelProvider: "mock",
        modelName: "mock-classifier",
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
        thresholds: {
          schema_valid_rate_min: 1,
          enum_accuracy_min: 1,
          field_level_accuracy_min: 1,
          latency_p95_max_ms: 100
        }
      });
      const run = await database.createRun({
        projectId: project.id,
        datasetId: dataset.id,
        runConfigId: runConfig.id,
        triggerSource: "manual",
        jobPayload: {
          apiKeySource: "none"
        }
      });

      await processRun(run.id);
      const firstCaseResults = await database.getCaseResults(run.id);
      const firstReport = await database.getRunReport(run.id);

      await processRun(run.id);
      const secondCaseResults = await database.getCaseResults(run.id);
      const secondReport = await database.getRunReport(run.id);

      expect(firstCaseResults).toHaveLength(1);
      expect(secondCaseResults).toHaveLength(1);
      expect(firstReport?.reportPath).toBe(secondReport?.reportPath);
      expect(secondReport?.report.summary.total_cases).toBe(1);
    } finally {
      await sandbox.cleanup();
    }
  });
});
