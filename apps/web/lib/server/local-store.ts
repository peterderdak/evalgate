import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

import { createId } from "./ids";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const STORAGE_DIR = path.join(DATA_DIR, "storage");

type LocalRunReport = {
  runId: string;
  reportPath: string;
  report: RunReport;
};

type LocalDb = {
  users: Array<{ id: string; email: string; createdAt: string }>;
  projects: Project[];
  datasets: Dataset[];
  runConfigs: RunConfig[];
  runs: Run[];
  runReports: LocalRunReport[];
  failures: FailureRecord[];
  caseResults: CaseResult[];
  ciTokens: CiToken[];
  jobs: Job[];
};

async function ensureDb() {
  await mkdir(STORAGE_DIR, { recursive: true });
  try {
    return JSON.parse(await readFile(DB_PATH, "utf8")) as LocalDb;
  } catch {
    const seed: LocalDb = {
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "demo@evalgate.local", createdAt: new Date().toISOString() }],
      projects: [],
      datasets: [],
      runConfigs: [],
      runs: [],
      runReports: [],
      failures: [],
      caseResults: [],
      ciTokens: [],
      jobs: []
    };
    await writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function persistDb(db: LocalDb) {
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function generateCiToken() {
  return `egt_${randomBytes(24).toString("hex")}`;
}

export async function saveDatasetFile(storagePath: string, contents: string) {
  const fullPath = path.join(STORAGE_DIR, storagePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
}

export async function readDatasetFile(storagePath: string) {
  return readFile(path.join(STORAGE_DIR, storagePath), "utf8");
}

export async function saveReportFile(storagePath: string, contents: string) {
  const fullPath = path.join(STORAGE_DIR, storagePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
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
  const db = await ensureDb();
  const project: Project = {
    id: createId("proj"),
    ownerId: input.ownerId,
    name: input.name,
    description: input.description,
    templateType: input.templateType,
    defaultSchema: input.defaultSchema,
    defaultThresholds: input.defaultThresholds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.projects.push(project);
  await persistDb(db);
  return project;
}

export async function listProjects(ownerId: string) {
  const db = await ensureDb();
  return db.projects.filter((project) => project.ownerId === ownerId);
}

export async function getProject(projectId: string) {
  const db = await ensureDb();
  return db.projects.find((project) => project.id === projectId) ?? null;
}

export async function createDataset(input: {
  projectId: string;
  filename: string;
  contents: string;
  rowCount: number;
}) {
  const db = await ensureDb();
  const version = db.datasets.filter((dataset) => dataset.projectId === input.projectId).length + 1;
  const dataset: Dataset = {
    id: createId("ds"),
    projectId: input.projectId,
    version,
    filename: input.filename,
    storagePath: `${input.projectId}/datasets/v${version}-${input.filename}`,
    rowCount: input.rowCount,
    sha256: sha256(input.contents),
    uploadedAt: new Date().toISOString()
  };
  db.datasets.push(dataset);
  await persistDb(db);
  await saveDatasetFile(dataset.storagePath, input.contents);
  return dataset;
}

export async function listDatasets(projectId: string) {
  const db = await ensureDb();
  return db.datasets.filter((dataset) => dataset.projectId === projectId);
}

export async function getDataset(datasetId: string) {
  const db = await ensureDb();
  return db.datasets.find((dataset) => dataset.id === datasetId) ?? null;
}

export async function createRunConfig(input: Omit<RunConfig, "id" | "createdAt">) {
  const db = await ensureDb();
  const runConfig: RunConfig = {
    ...input,
    id: createId("cfg"),
    createdAt: new Date().toISOString()
  };
  db.runConfigs.push(runConfig);
  await persistDb(db);
  return runConfig;
}

export async function listRunConfigs(projectId: string) {
  const db = await ensureDb();
  return db.runConfigs.filter((config) => config.projectId === projectId);
}

export async function getRunConfig(runConfigId: string) {
  const db = await ensureDb();
  return db.runConfigs.find((config) => config.id === runConfigId) ?? null;
}

export async function createRun(input: {
  projectId: string;
  datasetId: string;
  runConfigId: string;
  triggerSource: "manual" | "ci";
  jobPayload: EvalRunJobPayload;
}) {
  const db = await ensureDb();
  const run: Run = {
    id: createId("run"),
    projectId: input.projectId,
    datasetId: input.datasetId,
    runConfigId: input.runConfigId,
    triggerSource: input.triggerSource,
    status: "queued",
    processedCases: 0,
    createdAt: new Date().toISOString()
  };
  const job: Job = {
    id: createId("job"),
    type: "eval_run",
    runId: run.id,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    availableAt: new Date().toISOString(),
    payload: input.jobPayload,
    createdAt: new Date().toISOString()
  };
  db.runs.push(run);
  db.jobs.push(job);
  await persistDb(db);
  return run;
}

export async function listRuns(projectId: string) {
  const db = await ensureDb();
  return db.runs.filter((run) => run.projectId === projectId);
}

export async function getRun(runId: string) {
  const db = await ensureDb();
  return db.runs.find((run) => run.id === runId) ?? null;
}

export async function updateRun(runId: string, patch: Partial<Run>) {
  const db = await ensureDb();
  const run = db.runs.find((item) => item.id === runId);
  if (!run) {
    return null;
  }
  Object.assign(run, patch);
  await persistDb(db);
  return run;
}

export async function appendCaseResult(result: CaseResult) {
  const db = await ensureDb();
  db.caseResults.push(result);
  await persistDb(db);
}

export async function listFailures(runId: string) {
  const db = await ensureDb();
  return db.failures.filter((failure) => failure.runId === runId);
}

export async function createFailures(failures: FailureRecord[]) {
  const db = await ensureDb();
  db.failures.push(...failures);
  await persistDb(db);
}

export async function saveRunReport(runId: string, report: RunReport) {
  const db = await ensureDb();
  const reportPath = `${report.project_id}/reports/${runId}.json`;
  db.runReports = db.runReports.filter((row) => row.runId !== runId);
  db.runReports.push({ runId, reportPath, report });
  await persistDb(db);
  await saveReportFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

export async function getRunReport(runId: string) {
  const db = await ensureDb();
  return db.runReports.find((row) => row.runId === runId) ?? null;
}

export async function getCaseResults(runId: string) {
  const db = await ensureDb();
  return db.caseResults.filter((result) => result.runId === runId);
}

export async function getCiTokenByHash(projectId: string, tokenHash: string) {
  const db = await ensureDb();
  return db.ciTokens.find((token) => token.projectId === projectId && token.tokenHash === tokenHash) ?? null;
}

export async function listCiTokens(projectId: string) {
  const db = await ensureDb();
  return db.ciTokens.filter((token) => token.projectId === projectId);
}

export async function createCiToken(projectId: string, label?: string) {
  const db = await ensureDb();
  const plaintextToken = generateCiToken();
  const token: CiToken = {
    id: createId("citok"),
    projectId,
    tokenHash: sha256(plaintextToken),
    label,
    createdAt: new Date().toISOString()
  };
  db.ciTokens.push(token);
  await persistDb(db);
  return { token, plaintextToken };
}

export async function markCiTokenUsed(tokenId: string) {
  const db = await ensureDb();
  const token = db.ciTokens.find((candidate) => candidate.id === tokenId);
  if (!token) {
    return null;
  }
  token.lastUsedAt = new Date().toISOString();
  await persistDb(db);
  return token;
}

export async function getJobByRunId(runId: string) {
  const db = await ensureDb();
  return db.jobs.find((job) => job.runId === runId) ?? null;
}

export async function leaseNextJob(leaseOwner: string) {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const job = db.jobs.find((candidate) => candidate.status === "pending" && candidate.availableAt <= now);
  if (!job) {
    return null;
  }
  job.status = "leased";
  job.attempts += 1;
  job.leasedAt = now;
  job.leaseOwner = leaseOwner;
  await persistDb(db);
  return job;
}

export async function completeJob(jobId: string) {
  const db = await ensureDb();
  const job = db.jobs.find((candidate) => candidate.id === jobId);
  if (!job) {
    return;
  }
  job.status = "completed";
  await persistDb(db);
}

export async function failJob(jobId: string, message: string) {
  const db = await ensureDb();
  const job = db.jobs.find((candidate) => candidate.id === jobId);
  if (!job) {
    return;
  }
  job.status = job.attempts >= job.maxAttempts ? "failed" : "pending";
  job.availableAt = new Date(Date.now() + 1000 * Math.max(job.attempts, 1)).toISOString();
  job.errorMessage = message;
  await persistDb(db);
}
