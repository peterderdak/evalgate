import { parseDatasetText, runEvaluation } from "@evalgate/eval-core";
import { requiresProviderApiKey } from "@evalgate/shared";
import type { CaseResult, RunSummaryResponse } from "@evalgate/shared";

import {
  appendCaseResult,
  completeJob,
  createFailures,
  getDataset,
  getJobByRunId,
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
import { decryptJobSecret } from "./job-secrets";

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
  const job = await getJobByRunId(run.id);
  if (!job) {
    throw new Error("Run job not found");
  }

  await updateRun(run.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    totalCases: dataset.rowCount
  });

  const datasetText = await readDatasetFile(dataset.storagePath);
  const apiKey =
    job.payload.apiKeySource === "encrypted"
      ? decryptJobSecret(job.payload.encryptedApiKey ?? "")
      : job.payload.apiKeySource === "env"
        ? process.env.OPENAI_API_KEY ?? ""
        : "";
  if (requiresProviderApiKey(runConfig.modelProvider) && !apiKey) {
    throw new Error("No provider API key available for run execution");
  }
  const failures: Awaited<ReturnType<typeof runEvaluation>>["failures"] = [];
  let processedCases = 0;

  const result = await runEvaluation({
    runId: run.id,
    projectId: run.projectId,
    cases: parseDatasetText(datasetText),
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
      processedCases += 1;
      await updateRun(run.id, {
        processedCases
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
    await updateRun(job.runId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    await failJob(job.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function maybeRunInline(runId: string) {
  if (process.env.EVALGATE_INLINE_WORKER !== "true") {
    return;
  }
  setTimeout(() => {
    void processRun(runId).catch(async (error) => {
      const job = await getJobByRunId(runId);
      await updateRun(runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      if (job) {
        await failJob(job.id, error instanceof Error ? error.message : String(error));
      }
    });
  }, 0);
}

export async function buildCiSummary(runId: string, requestUrl?: string): Promise<RunSummaryResponse | null> {
  const run = await getRun(runId);
  const reportRow = await getRunReport(runId);
  if (!run) {
    return null;
  }

  if (!reportRow) {
    return {
      runId: run.id,
      status: run.status,
      pass: false,
      metrics: {
        schema_valid_rate: null,
        enum_accuracy: null,
        field_level_accuracy: null,
        latency_p95_ms: null
      },
      gateReasons: run.errorMessage ? [run.errorMessage] : [],
      reportUrl: undefined
    };
  }

  const reportPath = `/api/runs/${run.id}/report`;
  const reportUrl = requestUrl ? new URL(reportPath, requestUrl).toString() : reportPath;

  return {
    runId: run.id,
    status: run.status,
    pass: reportRow.report.pass,
    metrics: reportRow.report.metrics,
    gateReasons: reportRow.report.gate_reasons
      .filter((reason) => !reason.passed)
      .map((reason) => {
        const comparator = reason.operator === ">=" ? "below" : "above";
        return `${reason.metric} ${comparator} threshold: ${reason.actual} ${reason.operator === ">=" ? "<" : ">"} ${reason.threshold}`;
      }),
    reportUrl
  };
}
