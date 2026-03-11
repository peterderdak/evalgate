import { parseDatasetText, runEvaluation } from "@evalgate/eval-core";
import { requiresProviderApiKey } from "@evalgate/shared";
import type { CaseResult, RunSummaryResponse } from "@evalgate/shared";

import {
  appendCaseResult,
  clearRunArtifacts,
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

function getProviderTimeoutMs() {
  return Math.max(Number(process.env.EVALGATE_PROVIDER_TIMEOUT_MS ?? 30000), 1);
}

function getProviderMaxRetries() {
  return Math.max(Number(process.env.EVALGATE_PROVIDER_MAX_RETRIES ?? 2), 0);
}

function getJobLeaseTimeoutMs() {
  return Math.max(Number(process.env.EVALGATE_JOB_LEASE_TIMEOUT_MS ?? 120000), 0);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableRunError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return !(
    message.includes("run not found") ||
    message.includes("run job not found") ||
    message.includes("missing dataset or run config") ||
    message.includes("no provider api key available") ||
    message.includes("unsupported model provider") ||
    message.includes("no evaluation cases supplied") ||
    message.includes("dataset is empty") ||
    message.includes("dataset exceeds") ||
    message.includes("dataset line")
  );
}

async function markRunForRetryOrFailure(runId: string, jobId: string, error: unknown) {
  const message = getErrorMessage(error);
  const job = await failJob(jobId, message, { retryable: isRetryableRunError(error) });

  await updateRun(runId, {
    status: job?.status === "pending" ? "queued" : "failed",
    startedAt: undefined,
    completedAt: job?.status === "pending" ? undefined : new Date().toISOString(),
    errorMessage: message
  });

  return job;
}

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

  const existingReport = await getRunReport(run.id);
  if (run.status === "completed" && existingReport) {
    return {
      metrics: existingReport.report.metrics,
      pass: existingReport.report.pass,
      failures: [],
      report: existingReport.report,
      gate: {
        pass: existingReport.report.pass,
        reasons: existingReport.report.gate_reasons
      },
      caseResults: [],
      reportPath: existingReport.reportPath
    };
  }

  await clearRunArtifacts(run.id);

  await updateRun(run.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    processedCases: 0,
    totalCases: dataset.rowCount,
    errorMessage: undefined
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
    providerTimeoutMs: getProviderTimeoutMs(),
    providerMaxRetries: getProviderMaxRetries(),
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
  const job = await leaseNextJob(leaseOwner, getJobLeaseTimeoutMs());
  if (!job) {
    return null;
  }

  try {
    await processRun(job.runId);
    await completeJob(job.id);
    return job;
  } catch (error) {
    await markRunForRetryOrFailure(job.runId, job.id, error);
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
      if (job) {
        await markRunForRetryOrFailure(runId, job.id, error);
      } else {
        await updateRun(runId, {
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: getErrorMessage(error)
        });
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
