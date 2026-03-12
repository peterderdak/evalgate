import { describe, expect, it } from "vitest";

import { compareReportToBaseline, createBaselineFromReport } from "../src/baseline.js";
import { createJunitXml, createSarifReport, createSummaryMarkdown } from "../src/reporter.js";
import type { EvaluationCaseResult, RunReport } from "../src/types.js";

function makeReport(overrides: Partial<RunReport> = {}): RunReport {
  return {
    run_id: "run_report",
    project_id: "cli_project",
    status: "completed",
    pass: false,
    schema_version: "1.0",
    tool_version: "0.1.0",
    provider: "mock",
    model: "mock-classifier",
    prompt_version: "v2",
    dataset_path: "/tmp/dataset.jsonl",
    dataset_sha256: "dataset-sha",
    config_sha256: "config-sha",
    git_sha: "abc123",
    git_branch: "main",
    started_at: "2026-03-12T00:00:00.000Z",
    finished_at: "2026-03-12T00:00:02.000Z",
    duration_ms: 2000,
    summary: {
      total_cases: 2,
      passed_cases: 1,
      failed_cases: 1
    },
    metrics: {
      schema_valid_rate: 0.95,
      enum_accuracy: 0.8,
      field_level_accuracy: 0.85,
      latency_p95_ms: 180
    },
    thresholds: {
      schema_valid_rate_min: 0.95,
      enum_accuracy_min: 0.9,
      field_level_accuracy_min: 0.9,
      latency_p95_max_ms: 150
    },
    gate_reasons: [
      {
        metric: "enum_accuracy",
        actual: 0.8,
        threshold: 0.9,
        operator: ">=",
        passed: false
      },
      {
        metric: "latency_p95_ms",
        actual: 180,
        threshold: 150,
        operator: "<=",
        passed: false
      }
    ],
    failure_counts_by_type: {
      schema_invalid: 0,
      wrong_enum: 1,
      field_mismatch: 0,
      missing_field: 0,
      timeout: 0,
      provider_error: 0,
      parse_error: 0
    },
    failures: [
      {
        testcase_id: "case_002",
        failure_type: "wrong_enum",
        input: {
          ticket_text: "Refund me now"
        },
        expected: {
          category: "refund"
        },
        actual: {
          category: "billing"
        },
        diff: {
          category: {
            expected: "refund",
            actual: "billing"
          }
        },
        latency_ms: 180
      }
    ],
    generated_at: "2026-03-12T00:00:02.000Z",
    ...overrides
  };
}

function makeCaseResults(): EvaluationCaseResult[] {
  return [
    {
      testcase: {
        id: "case_001",
        input: {
          ticket_text: "Customer says they were double charged"
        },
        expected: {
          category: "billing"
        }
      },
      actual: {
        category: "billing"
      },
      rawText: "{\"category\":\"billing\"}",
      schemaValid: true,
      validationErrors: [],
      enumCorrect: true,
      fieldAccuracy: 1,
      latencyMs: 120
    },
    {
      testcase: {
        id: "case_002",
        input: {
          ticket_text: "Refund me now"
        },
        expected: {
          category: "refund"
        }
      },
      actual: {
        category: "billing"
      },
      rawText: "{\"category\":\"billing\"}",
      schemaValid: true,
      validationErrors: [],
      enumCorrect: false,
      fieldAccuracy: 0,
      latencyMs: 180,
      failure: {
        id: "run_report_case_002",
        runId: "run_report",
        testcaseId: "case_002",
        failureType: "wrong_enum",
        input: {
          ticket_text: "Refund me now"
        },
        expected: {
          category: "refund"
        },
        actual: {
          category: "billing"
        },
        diff: {
          category: {
            expected: "refund",
            actual: "billing"
          }
        },
        latencyMs: 180,
        createdAt: "2026-03-12T00:00:02.000Z"
      }
    }
  ];
}

describe("reporter artifacts", () => {
  it("builds a markdown summary with baseline deltas and failure sections", () => {
    const baseline = createBaselineFromReport(
      makeReport({
        pass: true,
        gate_reasons: [],
        metrics: {
          schema_valid_rate: 1,
          enum_accuracy: 0.9,
          field_level_accuracy: 0.9,
          latency_p95_ms: 120
        }
      })
    );
    const comparison = compareReportToBaseline(makeReport(), baseline);

    const summary = createSummaryMarkdown({
      report: makeReport(),
      caseResults: makeCaseResults(),
      comparison
    });

    expect(summary).toContain("# EvalGate Summary");
    expect(summary).toContain("Gate: **FAIL**");
    expect(summary).toContain("Regression: **REGRESSION**");
    expect(summary).toContain("enum_accuracy regressed versus baseline");
    expect(summary).toContain("Top Failure Reasons");
    expect(summary).toContain("Slowest Cases");
    expect(summary).toContain("Top Example Diffs");
    expect(summary).toContain("\"expected\": \"refund\"");
  });

  it("builds junit with case failures and a synthetic gate failure", () => {
    const baseline = createBaselineFromReport(makeReport({ pass: true, gate_reasons: [] }));
    const comparison = compareReportToBaseline(makeReport(), baseline);

    const xml = createJunitXml({
      report: makeReport(),
      caseResults: makeCaseResults(),
      comparison
    });

    expect(xml).toContain("<testsuite");
    expect(xml).toContain('name="case_002"');
    expect(xml).toContain('message="wrong_enum"');
    expect(xml).toContain('name="gate"');
    expect(xml).toContain("gate_failed");
  });

  it("builds sarif with failure and gate results", () => {
    const baseline = createBaselineFromReport(makeReport({ pass: true, gate_reasons: [] }));
    const comparison = compareReportToBaseline(makeReport(), baseline);

    const sarif = createSarifReport({
      report: makeReport(),
      comparison
    });

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "wrong_enum"
        }),
        expect.objectContaining({
          ruleId: "gate_rule_1"
        })
      ])
    );
  });
});
