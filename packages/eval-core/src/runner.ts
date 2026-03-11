import path from "node:path";

import type { FailureRecord, RunReport } from "@evalgate/shared";

import { enumAccuracy } from "./metrics/enum-accuracy.js";
import { fieldLevelAccuracy } from "./metrics/field-level-accuracy.js";
import { latencyP95 } from "./metrics/latency-p95.js";
import { schemaValidRate } from "./metrics/schema-valid-rate.js";
import { getModelProvider } from "./providers/provider.js";
import { compareEnum } from "./scorers/compare-enum.js";
import { compareFields } from "./scorers/compare-fields.js";
import { evaluateGate } from "./reporter.js";
import type { EvaluationCaseResult, RunEvaluationInput, RunEvaluationOutput } from "./types.js";
import { loadDataset } from "./validators/dataset.js";
import { validateSchemaOutput } from "./validators/schema.js";

function buildDiff(expected: Record<string, unknown>, actual: Record<string, unknown> | null) {
  const { expectedFlat, actualFlat } = compareFields(expected, actual);
  return Object.fromEntries(
    Object.keys(expectedFlat)
      .filter((key) => expectedFlat[key] !== actualFlat[key])
      .map((key) => [
        key,
        {
          expected: expectedFlat[key],
          actual: actualFlat[key] ?? null
        }
      ])
  );
}

function detectFailureType(input: {
  providerFailureType: FailureRecord["failureType"] | null;
  schemaValid: boolean;
  actual: Record<string, unknown> | null;
  enumCorrect: boolean | null;
  fieldAccuracy: number;
  missingFields: number;
}): FailureRecord["failureType"] | null {
  if (input.providerFailureType) {
    return input.providerFailureType;
  }
  if (!input.actual) {
    return "parse_error";
  }
  if (!input.schemaValid) {
    return "schema_invalid";
  }
  if (input.enumCorrect === false) {
    return "wrong_enum";
  }
  if (input.missingFields > 0) {
    return "missing_field";
  }
  if (input.fieldAccuracy < 1) {
    return "field_mismatch";
  }
  return null;
}

export async function runEvaluation(input: RunEvaluationInput): Promise<RunEvaluationOutput> {
  const dataset = input.cases ?? (input.datasetPath ? await loadDataset(input.datasetPath) : null);
  if (!dataset || dataset.length === 0) {
    throw new Error("No evaluation cases supplied");
  }
  const failures: FailureRecord[] = [];
  const caseResults: EvaluationCaseResult[] = [];

  let validSchemaCases = 0;
  let enumCaseCount = 0;
  let correctEnumCases = 0;
  let matchedFields = 0;
  let totalFields = 0;
  const latencies: number[] = [];
  const provider = getModelProvider(input.runConfig.modelProvider);

  for (const testcase of dataset) {
    const startedAt = Date.now();
    let rawText = "";
    let actual: Record<string, unknown> | null = null;
    let providerFailureType: FailureRecord["failureType"] | null = null;

    try {
      const result = await provider.invokeStructured({
        apiKey: input.apiKey,
        model: input.runConfig.modelName,
        prompt: input.runConfig.promptText,
        input: testcase.input,
        schema: input.runConfig.schema
      });
      rawText = result.rawText;
      actual = result.parsedJson;
    } catch (error) {
      rawText = error instanceof Error ? error.message : String(error);
      providerFailureType = rawText.toLowerCase().includes("timeout") ? "timeout" : "provider_error";
    }

    const latencyMs = Date.now() - startedAt;
    latencies.push(latencyMs);
    const validation = validateSchemaOutput(input.runConfig.schema, actual);
    if (validation.valid) {
      validSchemaCases += 1;
    }

    const expectedObject =
      typeof testcase.expected === "object" && testcase.expected !== null
        ? (testcase.expected as Record<string, unknown>)
        : { value: testcase.expected };
    const fieldComparison = compareFields(expectedObject, actual);
    matchedFields += fieldComparison.matchedFields;
    totalFields += fieldComparison.totalFields;
    const missingFields = Object.keys(fieldComparison.expectedFlat).filter(
      (key) => !(key in fieldComparison.actualFlat)
    ).length;

    const enumComparison = compareEnum(expectedObject, actual, input.runConfig.schema);
    if (enumComparison) {
      enumCaseCount += 1;
      if (enumComparison.correct) {
        correctEnumCases += 1;
      }
    }

    const failureType = detectFailureType({
      providerFailureType,
      schemaValid: validation.valid,
      actual,
      enumCorrect: enumComparison?.correct ?? null,
      fieldAccuracy: fieldComparison.accuracy,
      missingFields
    });

    const caseResult: EvaluationCaseResult = {
      testcase,
      actual,
      rawText,
      schemaValid: validation.valid,
      validationErrors: validation.errors,
      enumCorrect: enumComparison?.correct ?? null,
      fieldAccuracy: Number(fieldComparison.accuracy.toFixed(4)),
      latencyMs
    };

    if (failureType) {
      caseResult.failure = {
        id: `${input.runId}_${testcase.id}`,
        runId: input.runId,
        testcaseId: testcase.id,
        failureType,
        input: testcase.input,
        expected: testcase.expected,
        actual,
        diff: buildDiff(expectedObject, actual),
        latencyMs,
        createdAt: new Date().toISOString()
      };
      failures.push(caseResult.failure);
    }

    caseResults.push(caseResult);
    await input.onCaseProcessed?.(caseResult);
  }

  const metrics: RunReport["metrics"] = {
    schema_valid_rate: schemaValidRate(dataset.length, validSchemaCases),
    enum_accuracy: enumAccuracy(enumCaseCount, correctEnumCases),
    field_level_accuracy: fieldLevelAccuracy(matchedFields, totalFields),
    latency_p95_ms: latencyP95(latencies)
  };
  const gate = evaluateGate(metrics, input.runConfig.thresholds);
  const report: RunReport = {
    run_id: input.runId,
    project_id: input.projectId,
    status: "completed",
    pass: gate.pass,
    summary: {
      total_cases: dataset.length,
      passed_cases: dataset.length - failures.length,
      failed_cases: failures.length
    },
    metrics,
    thresholds: input.runConfig.thresholds,
    gate_reasons: gate.reasons,
    failures: failures.map((failure) => ({
      testcase_id: failure.testcaseId,
      failure_type: failure.failureType,
      input: failure.input,
      expected: failure.expected,
      actual: failure.actual,
      diff: failure.diff,
      latency_ms: failure.latencyMs
    })),
    generated_at: new Date().toISOString()
  };

  return {
    metrics,
    pass: gate.pass,
    failures,
    report,
    gate,
    caseResults,
    reportPath: path.join(".artifacts", `${input.runId}-report.json`)
  };
}
