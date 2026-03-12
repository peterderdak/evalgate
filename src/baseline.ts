import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BASELINE_SCHEMA_VERSION,
  COMPARABLE_METRICS,
  type BaselineComparison,
  type BaselineMetricComparison,
  type ComparableMetricName,
  type ComparableMetricValue,
  type EvalBaseline,
  type MetricDirection,
  type MetricTrend,
  type RunReport
} from "./types.js";

const RATE_REGRESSION_EPSILON = 0.0001;
const LATENCY_REGRESSION_EPSILON_MS = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatMetricValue(metric: ComparableMetricName, value: ComparableMetricValue) {
  if (value === null) {
    return "n/a";
  }

  if (metric === "latency_p95_ms") {
    return `${Math.round(value)}`;
  }

  return value.toFixed(4);
}

function formatMetricDelta(metric: ComparableMetricName, value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const prefix = value >= 0 ? "+" : "";
  if (metric === "latency_p95_ms") {
    return `${prefix}${Math.round(value)}`;
  }

  return `${prefix}${value.toFixed(4)}`;
}

function padCell(value: string, width: number) {
  return value.padEnd(width, " ");
}

function getMetricDirection(metric: ComparableMetricName): MetricDirection {
  return metric === "latency_p95_ms" ? "lower_is_better" : "higher_is_better";
}

function getMetricTrend(
  direction: MetricDirection,
  metric: ComparableMetricName,
  current: ComparableMetricValue,
  baseline: ComparableMetricValue
): { delta: number | null; trend: MetricTrend } {
  if (current === null || baseline === null) {
    return {
      delta: null,
      trend: "not_comparable"
    };
  }

  const delta = Number((current - baseline).toFixed(4));
  const epsilon = metric === "latency_p95_ms" ? LATENCY_REGRESSION_EPSILON_MS : RATE_REGRESSION_EPSILON;

  if (Math.abs(delta) <= epsilon) {
    return {
      delta,
      trend: "unchanged"
    };
  }

  const improved = direction === "higher_is_better" ? delta > 0 : delta < 0;
  return {
    delta,
    trend: improved ? "improved" : "regressed"
  };
}

export function createBaselineFromReport(report: RunReport): EvalBaseline {
  return {
    schema_version: BASELINE_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    source_report: {
      run_id: report.run_id,
      schema_version: report.schema_version,
      tool_version: report.tool_version,
      provider: report.provider,
      model: report.model,
      prompt_version: report.prompt_version,
      dataset_path: report.dataset_path,
      dataset_sha256: report.dataset_sha256,
      config_sha256: report.config_sha256,
      git_sha: report.git_sha,
      git_branch: report.git_branch,
      generated_at: report.generated_at
    },
    metrics: report.metrics
  };
}

export function compareReportToBaseline(report: RunReport, baseline: EvalBaseline): BaselineComparison {
  const metrics: BaselineMetricComparison[] = COMPARABLE_METRICS.map((metric) => {
    const direction = getMetricDirection(metric);
    const { delta, trend } = getMetricTrend(direction, metric, report.metrics[metric], baseline.metrics[metric]);

    return {
      metric,
      current: report.metrics[metric],
      baseline: baseline.metrics[metric],
      delta,
      direction,
      trend
    };
  });

  const warnings: string[] = [];
  if (
    baseline.source_report.schema_version.trim().length > 0 &&
    baseline.source_report.schema_version !== report.schema_version
  ) {
    warnings.push(
      `Report schema version differs from baseline (${report.schema_version} vs ${baseline.source_report.schema_version}).`
    );
  }
  if (
    baseline.source_report.dataset_sha256 &&
    report.dataset_sha256 &&
    baseline.source_report.dataset_sha256 !== report.dataset_sha256
  ) {
    warnings.push("Dataset hash differs from baseline. Compare results may not be apples-to-apples.");
  }

  const regressions = metrics.filter((metric) => metric.trend === "regressed").map((metric) => metric.metric);

  return {
    reportRunId: report.run_id,
    baselineRunId: baseline.source_report.run_id,
    metrics,
    regressions,
    hasRegression: regressions.length > 0,
    warnings
  };
}

export function formatBaselineComparison(comparison: BaselineComparison) {
  const rows = comparison.metrics.map((metric) => ({
    metric: metric.metric,
    current: formatMetricValue(metric.metric, metric.current),
    baseline: formatMetricValue(metric.metric, metric.baseline),
    delta: formatMetricDelta(metric.metric, metric.delta),
    status: metric.trend.replaceAll("_", " ")
  }));

  const headers = {
    metric: "Metric",
    current: "Current",
    baseline: "Baseline",
    delta: "Delta",
    status: "Status"
  };

  const widths = {
    metric: Math.max(headers.metric.length, ...rows.map((row) => row.metric.length)),
    current: Math.max(headers.current.length, ...rows.map((row) => row.current.length)),
    baseline: Math.max(headers.baseline.length, ...rows.map((row) => row.baseline.length)),
    delta: Math.max(headers.delta.length, ...rows.map((row) => row.delta.length)),
    status: Math.max(headers.status.length, ...rows.map((row) => row.status.length))
  };

  const lines = [
    "Comparison vs baseline:",
    `${padCell(headers.metric, widths.metric)}  ${padCell(headers.current, widths.current)}  ${padCell(headers.baseline, widths.baseline)}  ${padCell(headers.delta, widths.delta)}  ${padCell(headers.status, widths.status)}`,
    `${"-".repeat(widths.metric)}  ${"-".repeat(widths.current)}  ${"-".repeat(widths.baseline)}  ${"-".repeat(widths.delta)}  ${"-".repeat(widths.status)}`
  ];

  for (const row of rows) {
    lines.push(
      `${padCell(row.metric, widths.metric)}  ${padCell(row.current, widths.current)}  ${padCell(row.baseline, widths.baseline)}  ${padCell(row.delta, widths.delta)}  ${padCell(row.status, widths.status)}`
    );
  }

  if (comparison.warnings.length > 0) {
    lines.push("", ...comparison.warnings.map((warning) => `Warning: ${warning}`));
  }

  lines.push(
    "",
    comparison.hasRegression
      ? `Regression detected in: ${comparison.regressions.join(", ")}`
      : "No regression detected versus baseline."
  );

  return lines.join("\n");
}

export async function loadRunReport(reportPath: string): Promise<RunReport> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.metrics) || typeof parsed.run_id !== "string") {
    throw new Error(`Invalid report file: ${reportPath}`);
  }

  return parsed as RunReport;
}

export async function loadBaseline(baselinePath: string): Promise<EvalBaseline> {
  const parsed = JSON.parse(await readFile(baselinePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.metrics) || !isRecord(parsed.source_report)) {
    throw new Error(`Invalid baseline file: ${baselinePath}`);
  }

  return parsed as EvalBaseline;
}

export async function writeBaselineJson(outputPath: string, baseline: EvalBaseline) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(baseline, null, 2), "utf8");
}
