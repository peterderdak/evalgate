import { describe, expect, it } from "vitest";

import {
  compareReportToBaseline,
  createBaselineFromReport,
  formatBaselineComparison
} from "../src/baseline.js";
import type { RunReport } from "../src/types.js";

function makeReport(overrides: Partial<RunReport> = {}): RunReport {
  return {
    run_id: "run_123",
    project_id: "cli_project",
    status: "completed",
    pass: true,
    schema_version: "1.0",
    tool_version: "0.1.0",
    provider: "mock",
    model: "mock-classifier",
    prompt_version: "v1",
    dataset_path: "/tmp/dataset.jsonl",
    dataset_sha256: "dataset-sha",
    config_sha256: "config-sha",
    git_sha: "abc123",
    git_branch: "main",
    started_at: "2026-03-12T00:00:00.000Z",
    finished_at: "2026-03-12T00:00:01.000Z",
    duration_ms: 1000,
    summary: {
      total_cases: 10,
      passed_cases: 10,
      failed_cases: 0
    },
    metrics: {
      schema_valid_rate: 1,
      enum_accuracy: 0.9,
      field_level_accuracy: 0.95,
      latency_p95_ms: 120
    },
    thresholds: {
      schema_valid_rate_min: 0.95,
      enum_accuracy_min: 0.9,
      field_level_accuracy_min: 0.9,
      latency_p95_max_ms: 2500
    },
    gate_reasons: [],
    failure_counts_by_type: {
      schema_invalid: 0,
      wrong_enum: 0,
      field_mismatch: 0,
      missing_field: 0,
      timeout: 0,
      provider_error: 0,
      parse_error: 0
    },
    failures: [],
    generated_at: "2026-03-12T00:00:01.000Z",
    ...overrides
  };
}

describe("baseline support", () => {
  it("creates a baseline from a report", () => {
    const report = makeReport();
    const baseline = createBaselineFromReport(report);

    expect(baseline.schema_version).toBe("1.0");
    expect(baseline.source_report.run_id).toBe("run_123");
    expect(baseline.source_report.provider).toBe("mock");
    expect(baseline.metrics).toEqual(report.metrics);
  });

  it("compares a report against a baseline and identifies regressions", () => {
    const baseline = createBaselineFromReport(makeReport());
    const report = makeReport({
      run_id: "run_456",
      metrics: {
        schema_valid_rate: 0.98,
        enum_accuracy: 0.85,
        field_level_accuracy: 0.95,
        latency_p95_ms: 180
      }
    });

    const comparison = compareReportToBaseline(report, baseline);

    expect(comparison.hasRegression).toBe(true);
    expect(comparison.regressions).toEqual(["schema_valid_rate", "enum_accuracy", "latency_p95_ms"]);
    expect(comparison.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "schema_valid_rate",
          delta: -0.02,
          trend: "regressed"
        }),
        expect.objectContaining({
          metric: "field_level_accuracy",
          delta: 0,
          trend: "unchanged"
        }),
        expect.objectContaining({
          metric: "latency_p95_ms",
          delta: 60,
          trend: "regressed"
        })
      ])
    );
  });

  it("formats a comparison table with deltas", () => {
    const comparison = compareReportToBaseline(
      makeReport({
        metrics: {
          schema_valid_rate: 1,
          enum_accuracy: 0.92,
          field_level_accuracy: 0.96,
          latency_p95_ms: 100
        }
      }),
      createBaselineFromReport(makeReport())
    );

    const output = formatBaselineComparison(comparison);

    expect(output).toContain("Comparison vs baseline:");
    expect(output).toContain("schema_valid_rate");
    expect(output).toContain("+0.0200");
    expect(output).toContain("-20");
    expect(output).toContain("No regression detected versus baseline.");
  });

  it("treats small latency jitter as unchanged", () => {
    const comparison = compareReportToBaseline(
      makeReport({
        metrics: {
          schema_valid_rate: 1,
          enum_accuracy: 0.9,
          field_level_accuracy: 0.95,
          latency_p95_ms: 123
        }
      }),
      createBaselineFromReport(
        makeReport({
          metrics: {
            schema_valid_rate: 1,
            enum_accuracy: 0.9,
            field_level_accuracy: 0.95,
            latency_p95_ms: 120
          }
        })
      )
    );

    expect(comparison.hasRegression).toBe(false);
    expect(comparison.metrics.find((metric) => metric.metric === "latency_p95_ms")?.trend).toBe("unchanged");
  });
});
