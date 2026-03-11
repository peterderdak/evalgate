import { createHash, randomBytes } from "node:crypto";

import type {
  CaseResult,
  CiToken,
  Dataset,
  EvalRunJobPayload,
  FailureRecord,
  Job,
  Project,
  Run,
  RunConfig,
  RunReport
} from "@evalgate/shared";

import { getSupabaseServerClient } from "../supabase/client";

function getSupabase() {
  const client = getSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client;
}

function getBuckets() {
  return {
    datasets: process.env.SUPABASE_BUCKET_DATASETS ?? "eval-datasets",
    reports: process.env.SUPABASE_BUCKET_REPORTS ?? "eval-reports"
  };
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function generateCiToken() {
  return `egt_${randomBytes(24).toString("hex")}`;
}

function retryDelayMs(attempts: number) {
  return Math.min(30000, 1000 * 2 ** Math.max(attempts - 1, 0));
}

function mapProject(row: {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  template_type: string;
  default_schema: Record<string, unknown> | null;
  default_thresholds: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    templateType: row.template_type,
    defaultSchema: row.default_schema ?? undefined,
    defaultThresholds: row.default_thresholds ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDataset(row: {
  id: string;
  project_id: string;
  version: number;
  filename: string;
  storage_path: string;
  row_count: number;
  sha256: string;
  uploaded_at: string;
}): Dataset {
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    filename: row.filename,
    storagePath: row.storage_path,
    rowCount: row.row_count,
    sha256: row.sha256,
    uploadedAt: row.uploaded_at
  };
}

function mapRunConfig(row: {
  id: string;
  project_id: string;
  name: string;
  prompt_text: string;
  prompt_version: string | null;
  model_provider: string;
  model_name: string;
  schema_json: Record<string, unknown>;
  thresholds_json: Record<string, unknown>;
  created_at: string;
}): RunConfig {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    promptText: row.prompt_text,
    promptVersion: row.prompt_version ?? undefined,
    modelProvider: row.model_provider,
    modelName: row.model_name,
    schema: row.schema_json,
    thresholds: row.thresholds_json,
    createdAt: row.created_at
  };
}

function mapRun(row: {
  id: string;
  project_id: string;
  dataset_id: string;
  run_config_id: string;
  trigger_source: "manual" | "ci";
  status: Run["status"];
  started_at: string | null;
  completed_at: string | null;
  total_cases: number | null;
  processed_cases: number;
  cost_estimate_usd: number | null;
  error_message: string | null;
  created_at: string;
}): Run {
  return {
    id: row.id,
    projectId: row.project_id,
    datasetId: row.dataset_id,
    runConfigId: row.run_config_id,
    triggerSource: row.trigger_source,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    totalCases: row.total_cases ?? undefined,
    processedCases: row.processed_cases,
    costEstimateUsd: row.cost_estimate_usd ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at
  };
}

function mapCiToken(row: {
  id: string;
  project_id: string;
  token_hash: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
}): CiToken {
  return {
    id: row.id,
    projectId: row.project_id,
    tokenHash: row.token_hash,
    label: row.label ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at
  };
}

function mapJob(row: {
  id: string;
  type: "eval_run";
  run_id: string;
  status: Job["status"];
  attempts: number;
  max_attempts: number;
  available_at: string;
  leased_at: string | null;
  lease_owner: string | null;
  error_message: string | null;
  payload_json: EvalRunJobPayload;
  created_at: string;
}): Job {
  return {
    id: row.id,
    type: row.type,
    runId: row.run_id,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leasedAt: row.leased_at ?? undefined,
    leaseOwner: row.lease_owner ?? undefined,
    errorMessage: row.error_message ?? undefined,
    payload: row.payload_json,
    createdAt: row.created_at
  };
}

function mapFailure(row: {
  id: string;
  run_id: string;
  testcase_id: string;
  failure_type: FailureRecord["failureType"];
  input_json: Record<string, unknown> | null;
  expected_json: FailureRecord["expected"] | null;
  actual_json: FailureRecord["actual"] | null;
  diff_json: Record<string, unknown> | null;
  latency_ms: number | null;
  created_at: string;
}): FailureRecord {
  return {
    id: row.id,
    runId: row.run_id,
    testcaseId: row.testcase_id,
    failureType: row.failure_type,
    input: row.input_json ?? {},
    expected: row.expected_json ?? {},
    actual: row.actual_json ?? null,
    diff: row.diff_json ?? {},
    latencyMs: row.latency_ms ?? 0,
    createdAt: row.created_at
  };
}

function mapCaseResult(row: {
  id: string;
  run_id: string;
  testcase_id: string;
  input_json: Record<string, unknown>;
  expected_json: CaseResult["expected"] | null;
  actual_json: CaseResult["actual"] | null;
  schema_valid: boolean;
  enum_correct: boolean | null;
  field_accuracy: number | null;
  latency_ms: number | null;
  error_type: string | null;
  created_at: string;
}): CaseResult {
  return {
    id: row.id,
    runId: row.run_id,
    testcaseId: row.testcase_id,
    input: row.input_json,
    expected: row.expected_json ?? {},
    actual: row.actual_json ?? null,
    schemaValid: row.schema_valid,
    enumCorrect: row.enum_correct,
    fieldAccuracy: row.field_accuracy ?? 0,
    latencyMs: row.latency_ms ?? 0,
    errorType: row.error_type ?? undefined,
    createdAt: row.created_at
  };
}

async function ensureRemoteUser(ownerId: string, ownerEmail = "demo@evalgate.local") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("users")
    .upsert({ id: ownerId, email: ownerEmail }, { onConflict: "id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveDatasetFile(storagePath: string, contents: string) {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(getBuckets().datasets).upload(storagePath, Buffer.from(contents, "utf8"), {
    upsert: true,
    contentType: "application/x-ndjson"
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function readDatasetFile(storagePath: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(getBuckets().datasets).download(storagePath);
  if (error) {
    throw new Error(error.message);
  }
  return data.text();
}

export async function saveReportFile(storagePath: string, contents: string) {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(getBuckets().reports).upload(storagePath, Buffer.from(contents, "utf8"), {
    upsert: true,
    contentType: "application/json"
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function createProject(input: {
  ownerId: string;
  ownerEmail?: string;
  name: string;
  description: string;
  templateType: string;
  defaultSchema?: Record<string, unknown>;
  defaultThresholds?: Record<string, unknown>;
}) {
  const supabase = getSupabase();
  await ensureRemoteUser(input.ownerId, input.ownerEmail);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      description: input.description,
      template_type: input.templateType,
      default_schema: input.defaultSchema ?? null,
      default_thresholds: input.defaultThresholds ?? null
    })
    .select("id, owner_id, name, description, template_type, default_schema, default_thresholds, created_at, updated_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }

  return mapProject(data);
}

export async function listProjects(ownerId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, description, template_type, default_schema, default_thresholds, created_at, updated_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapProject);
}

export async function getProject(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, description, template_type, default_schema, default_thresholds, created_at, updated_at")
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapProject(data) : null;
}

export async function createDataset(input: {
  projectId: string;
  filename: string;
  contents: string;
  rowCount: number;
}) {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("datasets")
    .select("version")
    .eq("project_id", input.projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  const version = (existing?.version ?? 0) + 1;
  const storagePath = `${input.projectId}/datasets/v${version}-${input.filename}`;
  await saveDatasetFile(storagePath, input.contents);

  const { data, error } = await supabase
    .from("datasets")
    .insert({
      project_id: input.projectId,
      version,
      filename: input.filename,
      storage_path: storagePath,
      row_count: input.rowCount,
      sha256: sha256(input.contents)
    })
    .select("id, project_id, version, filename, storage_path, row_count, sha256, uploaded_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapDataset(data);
}

export async function listDatasets(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, project_id, version, filename, storage_path, row_count, sha256, uploaded_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapDataset);
}

export async function getDataset(datasetId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, project_id, version, filename, storage_path, row_count, sha256, uploaded_at")
    .eq("id", datasetId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapDataset(data) : null;
}

export async function createRunConfig(input: Omit<RunConfig, "id" | "createdAt">) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("run_configs")
    .insert({
      project_id: input.projectId,
      name: input.name,
      prompt_text: input.promptText,
      prompt_version: input.promptVersion ?? null,
      model_provider: input.modelProvider,
      model_name: input.modelName,
      schema_json: input.schema,
      thresholds_json: input.thresholds
    })
    .select("id, project_id, name, prompt_text, prompt_version, model_provider, model_name, schema_json, thresholds_json, created_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapRunConfig(data);
}

export async function listRunConfigs(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("run_configs")
    .select("id, project_id, name, prompt_text, prompt_version, model_provider, model_name, schema_json, thresholds_json, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapRunConfig);
}

export async function getRunConfig(runConfigId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("run_configs")
    .select("id, project_id, name, prompt_text, prompt_version, model_provider, model_name, schema_json, thresholds_json, created_at")
    .eq("id", runConfigId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapRunConfig(data) : null;
}

export async function createRun(input: {
  projectId: string;
  datasetId: string;
  runConfigId: string;
  triggerSource: "manual" | "ci";
  jobPayload: EvalRunJobPayload;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runs")
    .insert({
      project_id: input.projectId,
      dataset_id: input.datasetId,
      run_config_id: input.runConfigId,
      trigger_source: input.triggerSource,
      status: "queued",
      processed_cases: 0
    })
    .select("id, project_id, dataset_id, run_config_id, trigger_source, status, started_at, completed_at, total_cases, processed_cases, cost_estimate_usd, error_message, created_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }

  const { error: jobError } = await supabase.from("jobs").insert({
    type: "eval_run",
    run_id: data.id,
    status: "pending",
    payload_json: input.jobPayload
  });
  if (jobError) {
    throw new Error(jobError.message);
  }

  return mapRun(data);
}

export async function listRuns(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runs")
    .select("id, project_id, dataset_id, run_config_id, trigger_source, status, started_at, completed_at, total_cases, processed_cases, cost_estimate_usd, error_message, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapRun);
}

export async function getRun(runId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runs")
    .select("id, project_id, dataset_id, run_config_id, trigger_source, status, started_at, completed_at, total_cases, processed_cases, cost_estimate_usd, error_message, created_at")
    .eq("id", runId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapRun(data) : null;
}

export async function updateRun(runId: string, patch: Partial<Run>) {
  const supabase = getSupabase();
  const update = {
    ...("status" in patch ? { status: patch.status } : {}),
    ...("startedAt" in patch ? { started_at: patch.startedAt ?? null } : {}),
    ...("completedAt" in patch ? { completed_at: patch.completedAt ?? null } : {}),
    ...("totalCases" in patch ? { total_cases: patch.totalCases ?? null } : {}),
    ...("processedCases" in patch ? { processed_cases: patch.processedCases } : {}),
    ...("costEstimateUsd" in patch ? { cost_estimate_usd: patch.costEstimateUsd ?? null } : {}),
    ...("errorMessage" in patch ? { error_message: patch.errorMessage ?? null } : {})
  };
  const { data, error } = await supabase
    .from("runs")
    .update(update)
    .eq("id", runId)
    .select("id, project_id, dataset_id, run_config_id, trigger_source, status, started_at, completed_at, total_cases, processed_cases, cost_estimate_usd, error_message, created_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapRun(data);
}

export async function appendCaseResult(result: CaseResult) {
  const supabase = getSupabase();
  const { error } = await supabase.from("case_results").insert({
    run_id: result.runId,
    testcase_id: result.testcaseId,
    input_json: result.input,
    expected_json: result.expected,
    actual_json: result.actual,
    schema_valid: result.schemaValid,
    enum_correct: result.enumCorrect,
    field_accuracy: result.fieldAccuracy,
    latency_ms: result.latencyMs,
    error_type: result.errorType ?? null
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function listFailures(runId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("failures")
    .select("id, run_id, testcase_id, failure_type, input_json, expected_json, actual_json, diff_json, latency_ms, created_at")
    .eq("run_id", runId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapFailure);
}

export async function createFailures(failures: FailureRecord[]) {
  const supabase = getSupabase();
  if (failures.length === 0) {
    return;
  }
  const { error } = await supabase.from("failures").insert(
    failures.map((failure) => ({
      run_id: failure.runId,
      testcase_id: failure.testcaseId,
      failure_type: failure.failureType,
      input_json: failure.input,
      expected_json: failure.expected,
      actual_json: failure.actual,
      diff_json: failure.diff,
      latency_ms: failure.latencyMs
    }))
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveRunReport(runId: string, report: RunReport) {
  const supabase = getSupabase();
  const reportPath = `${report.project_id}/reports/${runId}.json`;
  await saveReportFile(reportPath, JSON.stringify(report, null, 2));
  const { error } = await supabase.from("run_results").upsert({
    run_id: runId,
    metrics_json: report.metrics,
    gate_pass: report.pass,
    report_path: reportPath,
    summary_json: report.summary
  });
  if (error) {
    throw new Error(error.message);
  }
  return reportPath;
}

export async function getRunReport(runId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("run_results")
    .select("run_id, report_path")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const { data: file, error: fileError } = await supabase.storage.from(getBuckets().reports).download(data.report_path);
  if (fileError) {
    throw new Error(fileError.message);
  }
  return {
    runId: data.run_id,
    reportPath: data.report_path,
    report: JSON.parse(await file.text()) as RunReport
  };
}

export async function getCaseResults(runId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("case_results")
    .select("id, run_id, testcase_id, input_json, expected_json, actual_json, schema_valid, enum_correct, field_accuracy, latency_ms, error_type, created_at")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapCaseResult);
}

export async function clearRunArtifacts(runId: string) {
  const supabase = getSupabase();
  const report = await getRunReport(runId);

  const { error: caseResultsError } = await supabase.from("case_results").delete().eq("run_id", runId);
  if (caseResultsError) {
    throw new Error(caseResultsError.message);
  }

  const { error: failuresError } = await supabase.from("failures").delete().eq("run_id", runId);
  if (failuresError) {
    throw new Error(failuresError.message);
  }

  const { error: runResultsError } = await supabase.from("run_results").delete().eq("run_id", runId);
  if (runResultsError) {
    throw new Error(runResultsError.message);
  }

  if (report?.reportPath) {
    const { error: storageError } = await supabase.storage.from(getBuckets().reports).remove([report.reportPath]);
    if (storageError) {
      throw new Error(storageError.message);
    }
  }
}

export async function getCiTokenByHash(projectId: string, tokenHash: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ci_tokens")
    .select("id, project_id, token_hash, label, last_used_at, created_at")
    .eq("project_id", projectId)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapCiToken(data) : null;
}

export async function listCiTokens(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ci_tokens")
    .select("id, project_id, token_hash, label, last_used_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapCiToken);
}

export async function createCiToken(projectId: string, label?: string) {
  const supabase = getSupabase();
  const plaintextToken = generateCiToken();
  const { data, error } = await supabase
    .from("ci_tokens")
    .insert({
      project_id: projectId,
      token_hash: sha256(plaintextToken),
      label: label ?? null
    })
    .select("id, project_id, token_hash, label, last_used_at, created_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return {
    token: mapCiToken(data),
    plaintextToken
  };
}

export async function markCiTokenUsed(tokenId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ci_tokens")
    .update({ last_used_at: now })
    .eq("id", tokenId)
    .select("id, project_id, token_hash, label, last_used_at, created_at")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapCiToken(data);
}

export async function getJobByRunId(runId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, type, run_id, status, attempts, max_attempts, available_at, leased_at, lease_owner, error_message, payload_json, created_at")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapJob(data) : null;
}

export async function leaseNextJob(leaseOwner: string, leaseTimeoutMs: number) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const expiredBefore = new Date(Date.now() - Math.max(leaseTimeoutMs, 0)).toISOString();

  const { data: expiredJobs, error: expiredError } = await supabase
    .from("jobs")
    .select("id, attempts, max_attempts")
    .eq("status", "leased")
    .lte("leased_at", expiredBefore);
  if (expiredError) {
    throw new Error(expiredError.message);
  }

  for (const expired of expiredJobs ?? []) {
    const { error: reclaimError } = await supabase
      .from("jobs")
      .update({
        status: expired.attempts >= expired.max_attempts ? "failed" : "pending",
        available_at: now,
        error_message: "Lease expired",
        leased_at: null,
        lease_owner: null
      })
      .eq("id", expired.id)
      .eq("status", "leased");
    if (reclaimError) {
      throw new Error(reclaimError.message);
    }
  }

  const { data: candidates, error } = await supabase
    .from("jobs")
    .select("id, type, run_id, status, attempts, max_attempts, available_at, leased_at, lease_owner, error_message, payload_json, created_at")
    .eq("status", "pending")
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) {
    throw new Error(error.message);
  }
  const candidate = candidates?.[0];
  if (!candidate) {
    return null;
  }

  const { data: leased, error: leaseError } = await supabase
    .from("jobs")
    .update({
      status: "leased",
      attempts: candidate.attempts + 1,
      leased_at: now,
      lease_owner: leaseOwner
    })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select("id, type, run_id, status, attempts, max_attempts, available_at, leased_at, lease_owner, error_message, payload_json, created_at")
    .maybeSingle();
  if (leaseError) {
    throw new Error(leaseError.message);
  }
  return leased ? mapJob(leased) : null;
}

export async function completeJob(jobId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "completed", leased_at: null, lease_owner: null, error_message: null })
    .eq("id", jobId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function failJob(jobId: string, message: string, options?: { retryable?: boolean }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, type, run_id, status, attempts, max_attempts, available_at, leased_at, lease_owner, error_message, payload_json, created_at")
    .eq("id", jobId)
    .single();
  if (error) {
    throw new Error(error.message);
  }

  const shouldRetry = options?.retryable !== false && data.attempts < data.max_attempts;
  const { data: updated, error: updateError } = await supabase
    .from("jobs")
    .update({
      status: shouldRetry ? "pending" : "failed",
      available_at: new Date(Date.now() + retryDelayMs(data.attempts)).toISOString(),
      error_message: message,
      leased_at: null,
      lease_owner: null
    })
    .eq("id", jobId)
    .select("id, type, run_id, status, attempts, max_attempts, available_at, leased_at, lease_owner, error_message, payload_json, created_at")
    .single();
  if (updateError) {
    throw new Error(updateError.message);
  }

  return mapJob(updated);
}
