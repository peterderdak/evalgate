import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  FAILURE_TYPES,
  OPTIONAL_ARTIFACT_FORMATS,
  RUN_REPORT_SCHEMA_VERSION,
  type BaselineComparison,
  type EvaluationCaseResult,
  type FailureRecord,
  type GateResult,
  type OptionalArtifactFormat,
  type RunArtifactSet,
  type RunEvaluationInput,
  type RunReport,
  type Thresholds
} from "./types.js";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatMetricValue(metric: keyof RunReport["metrics"], value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (metric === "latency_p95_ms") {
    return `${Math.round(value)} ms`;
  }

  return value.toFixed(4);
}

function formatMetricDelta(metric: keyof RunReport["metrics"], value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const prefix = value >= 0 ? "+" : "";
  if (metric === "latency_p95_ms") {
    return `${prefix}${Math.round(value)} ms`;
  }

  return `${prefix}${value.toFixed(4)}`;
}

function formatGateReason(reason: GateResult["reasons"][number]) {
  const operatorText = reason.operator === ">=" ? "below threshold" : "above threshold";
  const actual = formatMetricValue(reason.metric as keyof RunReport["metrics"], reason.actual);
  const threshold = formatMetricValue(reason.metric as keyof RunReport["metrics"], reason.threshold);
  return `${reason.metric} ${operatorText}: actual ${actual}, threshold ${reason.operator} ${threshold}`;
}

function buildFailingRules(report: RunReport, comparison?: BaselineComparison) {
  const rules = report.gate_reasons.filter((reason) => !reason.passed).map((reason) => formatGateReason(reason));

  if (comparison?.hasRegression) {
    for (const metric of comparison.metrics.filter((entry) => entry.trend === "regressed")) {
      rules.push(
        `${metric.metric} regressed versus baseline: ${formatMetricValue(metric.metric, metric.current)} vs ${formatMetricValue(metric.metric, metric.baseline)} (${formatMetricDelta(metric.metric, metric.delta)})`
      );
    }
  }

  return rules;
}

function buildMetricsMarkdown(report: RunReport, comparison?: BaselineComparison) {
  if (!comparison) {
    return [
      "| Metric | Value |",
      "| --- | --- |",
      `| schema_valid_rate | ${formatMetricValue("schema_valid_rate", report.metrics.schema_valid_rate)} |`,
      `| enum_accuracy | ${formatMetricValue("enum_accuracy", report.metrics.enum_accuracy)} |`,
      `| field_level_accuracy | ${formatMetricValue("field_level_accuracy", report.metrics.field_level_accuracy)} |`,
      `| latency_p95_ms | ${formatMetricValue("latency_p95_ms", report.metrics.latency_p95_ms)} |`
    ].join("\n");
  }

  return [
    "| Metric | Current | Baseline | Delta | Status |",
    "| --- | --- | --- | --- | --- |",
    ...comparison.metrics.map(
      (metric) =>
        `| ${metric.metric} | ${formatMetricValue(metric.metric, metric.current)} | ${formatMetricValue(metric.metric, metric.baseline)} | ${formatMetricDelta(metric.metric, metric.delta)} | ${metric.trend.replaceAll("_", " ")} |`
    )
  ].join("\n");
}

export function createSummaryMarkdown(input: {
  report: RunReport;
  caseResults: EvaluationCaseResult[];
  comparison?: BaselineComparison;
}): string {
  const { report, caseResults, comparison } = input;
  const failingRules = buildFailingRules(report, comparison);
  const failureReasons = Object.entries(report.failure_counts_by_type)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1]);
  const slowestCases = [...caseResults]
    .sort((left, right) => right.latencyMs - left.latencyMs)
    .slice(0, 5);
  const topDiffs = report.failures.slice(0, 3);
  const regressionStatus = comparison
    ? comparison.hasRegression
      ? "REGRESSION"
      : "no regression"
    : "not checked";

  const sections = [
    "# EvalGate Summary",
    "",
    `- Gate: **${report.pass ? "PASS" : "FAIL"}**`,
    `- Regression: **${regressionStatus}**`,
    `- Provider / Model: \`${report.provider}\` / \`${report.model}\``,
    `- Run ID: \`${report.run_id}\``,
    `- Started: \`${report.started_at}\``,
    `- Finished: \`${report.finished_at}\``,
    `- Duration: \`${report.duration_ms} ms\``,
    report.dataset_path ? `- Dataset: \`${report.dataset_path}\`` : null,
    "",
    "## Metrics",
    "",
    buildMetricsMarkdown(report, comparison),
    "",
    "## Failing Rules",
    "",
    failingRules.length > 0 ? failingRules.map((rule) => `- ${rule}`).join("\n") : "- None",
    "",
    "## Top Failure Reasons",
    "",
    failureReasons.length > 0
      ? failureReasons.map(([failureType, count]) => `- \`${failureType}\`: ${count}`).join("\n")
      : "- None",
    "",
    "## Slowest Cases",
    "",
    "| Test case | Latency | Result |",
    "| --- | --- | --- |",
    ...slowestCases.map((caseResult) => {
      const result = caseResult.failure ? `failed (${caseResult.failure.failureType})` : "passed";
      return `| ${caseResult.testcase.id} | ${caseResult.latencyMs} ms | ${result} |`;
    }),
    "",
    "## Top Example Diffs",
    ""
  ].filter((value): value is string => value !== null);

  if (topDiffs.length === 0) {
    sections.push("- No failing case diffs.");
  } else {
    for (const failure of topDiffs) {
      sections.push(
        `### ${failure.testcase_id} (${failure.failure_type})`,
        "",
        "```json",
        JSON.stringify(failure.diff, null, 2),
        "```",
        ""
      );
    }
  }

  if (comparison?.warnings.length) {
    sections.push("## Comparison Warnings", "", ...comparison.warnings.map((warning) => `- ${warning}`), "");
  }

  return `${sections.join("\n").trimEnd()}\n`;
}

export function createJunitXml(input: {
  report: RunReport;
  caseResults: EvaluationCaseResult[];
  comparison?: BaselineComparison;
}): string {
  const { report, caseResults, comparison } = input;
  const failingRules = buildFailingRules(report, comparison);
  const suiteFailures = report.failures.length + (failingRules.length > 0 ? 1 : 0);
  const testcases = caseResults.map((caseResult) => {
    const body = [
      `<testcase classname="EvalGate.${escapeXml(report.provider)}" name="${escapeXml(caseResult.testcase.id)}" time="${(caseResult.latencyMs / 1000).toFixed(3)}">`
    ];

    if (caseResult.failure) {
      body.push(
        `<failure message="${escapeXml(caseResult.failure.failureType)}">${escapeXml(
          JSON.stringify(
            {
              failure_type: caseResult.failure.failureType,
              diff: caseResult.failure.diff,
              expected: caseResult.failure.expected,
              actual: caseResult.failure.actual
            },
            null,
            2
          )
        )}</failure>`
      );
    }

    body.push("</testcase>");
    return body.join("");
  });

  const gateTestcase = [
    `<testcase classname="EvalGate" name="gate" time="${(report.duration_ms / 1000).toFixed(3)}">`,
    failingRules.length > 0 ? `<failure message="gate_failed">${escapeXml(failingRules.join("\n"))}</failure>` : "",
    "</testcase>"
  ].join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="EvalGate" tests="${caseResults.length + 1}" failures="${suiteFailures}" time="${(report.duration_ms / 1000).toFixed(3)}" timestamp="${escapeXml(report.started_at)}">`,
    ...testcases,
    gateTestcase,
    "</testsuite>"
  ].join("\n");
}

export function createSarifReport(input: {
  report: RunReport;
  comparison?: BaselineComparison;
}) {
  const { report, comparison } = input;
  const failingRules = buildFailingRules(report, comparison);
  const results = [
    ...report.failures.map((failure) => ({
      ruleId: failure.failure_type,
      level: "error",
      message: {
        text: `${failure.failure_type} on ${failure.testcase_id}`
      },
      partialFingerprints: {
        testcaseId: failure.testcase_id
      },
      properties: {
        testcaseId: failure.testcase_id,
        latencyMs: failure.latency_ms,
        diff: failure.diff
      }
    })),
    ...failingRules.map((rule, index) => ({
      ruleId: `gate_rule_${index + 1}`,
      level: "error",
      message: {
        text: rule
      },
      properties: {
        category: "gate"
      }
    }))
  ];

  const uniqueRuleIds = [...new Set(results.map((result) => result.ruleId))];

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "EvalGate",
            version: report.tool_version ?? undefined,
            rules: uniqueRuleIds.map((id) => ({
              id,
              name: id,
              shortDescription: {
                text: id
              }
            }))
          }
        },
        results
      }
    ]
  };
}

export async function writeSummaryMarkdown(path: string, report: string) {
  await writeFile(path, report, "utf8");
}

export async function writeJunitXml(path: string, xml: string) {
  await writeFile(path, xml, "utf8");
}

export async function writeSarifJson(path: string, sarifReport: ReturnType<typeof createSarifReport>) {
  await writeFile(path, JSON.stringify(sarifReport, null, 2), "utf8");
}

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

export async function writeRunArtifacts(input: {
  outputDir: string;
  reportPath: string;
  formats: OptionalArtifactFormat[];
  report: RunReport;
  caseResults: EvaluationCaseResult[];
  comparison?: BaselineComparison;
}): Promise<RunArtifactSet> {
  const formats = [...new Set(input.formats)].filter((format): format is OptionalArtifactFormat =>
    OPTIONAL_ARTIFACT_FORMATS.includes(format)
  );
  const artifactSet: RunArtifactSet = {
    reportJson: input.reportPath
  };

  await Promise.all([
    mkdir(path.dirname(input.reportPath), { recursive: true }),
    mkdir(input.outputDir, { recursive: true })
  ]);

  await writeReportJson(input.reportPath, input.report);

  if (formats.includes("summary")) {
    artifactSet.summaryMd = path.join(input.outputDir, "summary.md");
    await writeSummaryMarkdown(
      artifactSet.summaryMd,
      createSummaryMarkdown({
        report: input.report,
        caseResults: input.caseResults,
        comparison: input.comparison
      })
    );
  }

  if (formats.includes("junit")) {
    artifactSet.junitXml = path.join(input.outputDir, "junit.xml");
    await writeJunitXml(
      artifactSet.junitXml,
      createJunitXml({
        report: input.report,
        caseResults: input.caseResults,
        comparison: input.comparison
      })
    );
  }

  if (formats.includes("sarif")) {
    artifactSet.sarifJson = path.join(input.outputDir, "sarif.json");
    await writeSarifJson(
      artifactSet.sarifJson,
      createSarifReport({
        report: input.report,
        comparison: input.comparison
      })
    );
  }

  return artifactSet;
}
