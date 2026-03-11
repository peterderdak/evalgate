import { writeFile } from "node:fs/promises";

import type { GateResult, RunReport, Thresholds } from "./types.js";

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

export async function writeReportJson(path: string, report: RunReport) {
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
}
