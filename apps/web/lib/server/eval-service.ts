import path from "node:path";

import { writeReportJson, runEvaluation } from "@evalgate/eval-core";
import type { CaseResult, RunSummaryResponse } from "@evalgate/shared";

import {
  appendCaseResult,
  completeJob,
  createFailures,
  getDataset,
  getRun,
  getRunConfig,
  getRunReport,
  leaseNextJob,
  readDatasetFile,
  saveRunReport,
  updateRun,
  failJob
} from "./database";
import { createId } from "./ids";

export async function processRun(runId: string) {
  const run = await getRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }

  const dataset = await getDataset(run.datasetId);
  const runConfig = await getRunConfig(run.runConfigId);
  if (!dataset || !runConfig) {
    throw new Error("Missing dataset or run config");
  }

  await updateRun(run.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    totalCases: dataset.rowCount
  });

  const datasetStoragePath = path.join(process.cwd(), ".data", "storage", dataset.storagePath);
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const failures: Awaited<ReturnType<typeof runEvaluation>>["failures"] = [];

  const result = await runEvaluation({
    runId: run.id,
    projectId: run.projectId,
    datasetPath: datasetStoragePath,
    apiKey,
    runConfig,
    onCaseProcessed: async (caseResult) => {
      const caseRow: CaseResult = {
        id: createId("case"),
        runId: run.id,
        testcaseId: caseResult.testcase.id,
        input: caseResult.testcase.input,
        expected: caseResult.testcase.expected,
        actual: caseResult.actual,
        schemaValid: caseResult.schemaValid,
        enumCorrect: caseResult.enumCorrect,
        fieldAccuracy: caseResult.fieldAccuracy,
        latencyMs: caseResult.latencyMs,
        errorType: caseResult.failure?.failureType,
        createdAt: new Date().toISOString()
      };
      await appendCaseResult(caseRow);
      await updateRun(run.id, {
        processedCases: (await getRun(run.id))?.processedCases! + 1
      });
      if (caseResult.failure) {
        failures.push(caseResult.failure);
      }
    }
  });

  if (failures.length > 0) {
    await createFailures(
      failures.map((failure) => ({
        id: failure.id,
        runId: failure.runId,
        testcaseId: failure.testcaseId,
        failureType: failure.failureType,
        expected: failure.expected,
        actual: failure.actual,
        diff: failure.diff,
        latencyMs: failure.latencyMs,
        input: failure.input,
        createdAt: failure.createdAt
      }))
    );
  }

  const reportPath = await saveRunReport(run.id, result.report);
  await writeReportJson(path.join(process.cwd(), ".data", "storage", reportPath), result.report);
  await updateRun(run.id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    processedCases: result.report.summary.total_cases
  });

  return {
    ...result,
    reportPath
  };
}

export async function processNextPendingJob(leaseOwner: string) {
  const job = await leaseNextJob(leaseOwner);
  if (!job) {
    return null;
  }

  try {
    await processRun(job.runId);
    await completeJob(job.id);
    return job;
  } catch (error) {
    await failJob(job.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function maybeRunInline(runId: string) {
  if (process.env.EVALGATE_INLINE_WORKER !== "true") {
    return;
  }
  await processRun(runId);
}

export async function buildCiSummary(runId: string): Promise<RunSummaryResponse | null> {
  const run = await getRun(runId);
  const reportRow = await getRunReport(runId);
  if (!run || !reportRow) {
    return null;
  }

  return {
    runId: run.id,
    status: run.status,
    pass: reportRow.report.pass,
    metrics: reportRow.report.metrics,
    gateReasons: reportRow.report.gate_reasons.map((reason) => {
      const comparator = reason.operator === ">=" ? "below" : "above";
      return `${reason.metric} ${comparator} threshold: ${reason.actual} ${reason.operator === ">=" ? "<" : ">"} ${reason.threshold}`;
    }),
    reportUrl: `/api/runs/${run.id}/report`
  };
}
