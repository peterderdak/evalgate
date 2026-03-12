import { describe, expect, it, vi } from "vitest";

import { runEvaluation } from "../src/runner.js";
import { FAILURE_TYPES, RUN_REPORT_SCHEMA_VERSION, type ModelProvider } from "../src/types.js";

const baseRunConfig = {
  promptText: "Classify support tickets into the configured enum.",
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
    latency_p95_max_ms: 1000
  }
} as const;

const baseCases = [
  {
    id: "case_001",
    input: {
      ticket_text: "Customer says they were double charged on their last invoice"
    },
    expected: {
      category: "billing"
    }
  },
  {
    id: "case_002",
    input: {
      ticket_text: "Please cancel my subscription immediately"
    },
    expected: {
      category: "cancellation"
    }
  },
  {
    id: "case_003",
    input: {
      ticket_text: "Refund me now for this mistaken purchase"
    },
    expected: {
      category: "refund"
    }
  }
] as const;

describe("runEvaluation", () => {
  it("generates a passing report with the mock provider", async () => {
    const result = await runEvaluation({
      runId: "run_mock",
      projectId: "proj_mock",
      apiKey: "",
      cases: [...baseCases],
      reportContext: {
        schemaVersion: RUN_REPORT_SCHEMA_VERSION,
        toolVersion: "0.1.0",
        datasetPath: "examples/ticket-triage/dataset.jsonl",
        datasetSha256: "dataset-sha",
        configSha256: "config-sha",
        gitSha: "abc123",
        gitBranch: "main"
      },
      runConfig: baseRunConfig
    });

    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.report.schema_version).toBe(RUN_REPORT_SCHEMA_VERSION);
    expect(result.report.tool_version).toBe("0.1.0");
    expect(result.report.provider).toBe("mock");
    expect(result.report.model).toBe("mock-classifier");
    expect(result.report.prompt_version).toBeNull();
    expect(result.report.dataset_path).toBe("examples/ticket-triage/dataset.jsonl");
    expect(result.report.dataset_sha256).toBe("dataset-sha");
    expect(result.report.config_sha256).toBe("config-sha");
    expect(result.report.git_sha).toBe("abc123");
    expect(result.report.git_branch).toBe("main");
    expect(typeof result.report.started_at).toBe("string");
    expect(typeof result.report.finished_at).toBe("string");
    expect(result.report.duration_ms).toBeGreaterThanOrEqual(0);
    expect(Date.parse(result.report.finished_at)).toBeGreaterThanOrEqual(Date.parse(result.report.started_at));
    expect(result.report.summary.total_cases).toBe(3);
    expect(result.report.metrics.schema_valid_rate).toBe(1);
    expect(result.report.metrics.enum_accuracy).toBe(1);
    expect(result.report.metrics.field_level_accuracy).toBe(1);
    expect(result.report.metrics.latency_p95_ms).toBeGreaterThanOrEqual(1);
    expect(result.report.failure_counts_by_type).toEqual({
      schema_invalid: 0,
      wrong_enum: 0,
      field_mismatch: 0,
      missing_field: 0,
      timeout: 0,
      provider_error: 0,
      parse_error: 0
    });
  });

  it("retries transient provider failures and still completes the run", async () => {
    const invokeStructured = vi
      .fn<ModelProvider["invokeStructured"]>()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue({
        rawText: JSON.stringify({ category: "billing" }),
        parsedJson: { category: "billing" }
      });

    const result = await runEvaluation({
      runId: "run_retry",
      projectId: "proj_retry",
      apiKey: "",
      cases: [baseCases[0]],
      provider: { invokeStructured },
      providerMaxRetries: 1,
      providerTimeoutMs: 50,
      runConfig: baseRunConfig
    });

    expect(invokeStructured).toHaveBeenCalledTimes(2);
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("retries parse failures before recording a result", async () => {
    const invokeStructured = vi
      .fn<ModelProvider["invokeStructured"]>()
      .mockResolvedValueOnce({
        rawText: "not-json",
        parsedJson: null
      })
      .mockResolvedValueOnce({
        rawText: JSON.stringify({ category: "billing" }),
        parsedJson: { category: "billing" }
      });

    const result = await runEvaluation({
      runId: "run_parse_retry",
      projectId: "proj_parse_retry",
      apiKey: "",
      cases: [baseCases[0]],
      provider: { invokeStructured },
      providerMaxRetries: 1,
      retryOnParseFailure: true,
      runConfig: baseRunConfig
    });

    expect(invokeStructured).toHaveBeenCalledTimes(2);
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("records failure counts by failure type in the report", async () => {
    const invokeStructured = vi
      .fn<ModelProvider["invokeStructured"]>()
      .mockResolvedValue({
        rawText: JSON.stringify({ category: "billing" }),
        parsedJson: { category: "billing" }
      });

    const result = await runEvaluation({
      runId: "run_failure_counts",
      projectId: "proj_failure_counts",
      apiKey: "",
      cases: [baseCases[2]],
      provider: { invokeStructured },
      runConfig: baseRunConfig
    });

    expect(result.pass).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.failureType).toBe("wrong_enum");
    expect(result.report.failure_counts_by_type).toEqual({
      schema_invalid: 0,
      wrong_enum: 1,
      field_mismatch: 0,
      missing_field: 0,
      timeout: 0,
      provider_error: 0,
      parse_error: 0
    });
    expect(Object.keys(result.report.failure_counts_by_type)).toEqual([...FAILURE_TYPES]);
  });
});
