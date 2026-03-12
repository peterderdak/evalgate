import { writeFile } from "node:fs/promises";

import {
  FAILURE_TYPES,
  RUN_REPORT_SCHEMA_VERSION,
  type FailureRecord,
  type GateResult,
  type RunEvaluationInput,
  type RunReport,
  type Thresholds
} from "./types.js";

export function evaluateGate(
  metrics: RunReport["metrics"],
  thresholds: Thresholds
): GateResult {
  const reasons = [
    thresholds.schema_valid_rate_min !== undefined
      ? {
          metric: "schema_valid_rate",
          actual: metrics.schema_valid_rate,
          threshold: thresholds.schema_valid_rate_min,
          operator: ">=" as const,
          passed: metrics.schema_valid_rate >= thresholds.schema_valid_rate_min
        }
      : null,
    thresholds.enum_accuracy_min !== undefined && metrics.enum_accuracy !== null
      ? {
          metric: "enum_accuracy",
          actual: metrics.enum_accuracy,
          threshold: thresholds.enum_accuracy_min,
          operator: ">=" as const,
          passed: metrics.enum_accuracy >= thresholds.enum_accuracy_min
        }
      : null,
    thresholds.field_level_accuracy_min !== undefined
      ? {
          metric: "field_level_accuracy",
          actual: metrics.field_level_accuracy,
          threshold: thresholds.field_level_accuracy_min,
          operator: ">=" as const,
          passed: metrics.field_level_accuracy >= thresholds.field_level_accuracy_min
        }
      : null,
    thresholds.latency_p95_max_ms !== undefined
      ? {
          metric: "latency_p95_ms",
          actual: metrics.latency_p95_ms,
          threshold: thresholds.latency_p95_max_ms,
          operator: "<=" as const,
          passed: metrics.latency_p95_ms <= thresholds.latency_p95_max_ms
        }
      : null
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  return {
    pass: reasons.every((reason) => reason.passed),
    reasons
  };
}

function buildFailureCountsByType(failures: FailureRecord[]): Record<(typeof FAILURE_TYPES)[number], number> {
  const counts = Object.fromEntries(FAILURE_TYPES.map((failureType) => [failureType, 0])) as Record<
    (typeof FAILURE_TYPES)[number],
    number
  >;

  for (const failure of failures) {
    counts[failure.failureType] += 1;
  }

  return counts;
}

export function createRunReport(input: {
  runId: string;
  projectId?: string;
  totalCases: number;
  failures: FailureRecord[];
  metrics: RunReport["metrics"];
  gate: GateResult;
  runConfig: RunEvaluationInput["runConfig"];
  reportContext?: RunEvaluationInput["reportContext"];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}): RunReport {
  const reportContext = input.reportContext ?? {};

  return {
    run_id: input.runId,
    project_id: input.projectId ?? "cli_project",
    status: "completed",
    pass: input.gate.pass,
    schema_version: reportContext.schemaVersion ?? RUN_REPORT_SCHEMA_VERSION,
    tool_version: reportContext.toolVersion ?? null,
    provider: input.runConfig.modelProvider,
    model: input.runConfig.modelName,
    prompt_version: input.runConfig.promptVersion ?? null,
    dataset_path: reportContext.datasetPath ?? null,
    dataset_sha256: reportContext.datasetSha256 ?? null,
    config_sha256: reportContext.configSha256 ?? null,
    git_sha: reportContext.gitSha ?? null,
    git_branch: reportContext.gitBranch ?? null,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    duration_ms: input.durationMs,
    summary: {
      total_cases: input.totalCases,
      passed_cases: input.totalCases - input.failures.length,
      failed_cases: input.failures.length
    },
    metrics: input.metrics,
    thresholds: input.runConfig.thresholds,
    gate_reasons: input.gate.reasons,
    failure_counts_by_type: buildFailureCountsByType(input.failures),
    failures: input.failures.map((failure) => ({
      testcase_id: failure.testcaseId,
      failure_type: failure.failureType,
      input: failure.input,
      expected: failure.expected,
      actual: failure.actual,
      diff: failure.diff,
      latency_ms: failure.latencyMs
    })),
    generated_at: input.finishedAt
  };
}

export async function writeReportJson(path: string, report: RunReport) {
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
}
