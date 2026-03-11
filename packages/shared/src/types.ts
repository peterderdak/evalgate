export type JsonObject = Record<string, unknown>;

export type EvalCase = {
  id: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown> | string | number | boolean;
  metadata?: Record<string, unknown>;
};

export type EvalRunJobPayload = {
  apiKeySource: "encrypted" | "env";
  encryptedApiKey?: string;
  pullRequest?: {
    number: number;
    sha: string;
    branch: string;
  };
};

export type Thresholds = {
  schema_valid_rate_min?: number;
  enum_accuracy_min?: number;
  field_level_accuracy_min?: number;
  latency_p95_max_ms?: number;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  templateType: string;
  defaultSchema?: JsonObject;
  defaultThresholds?: Thresholds;
  createdAt: string;
  updatedAt: string;
};

export type Dataset = {
  id: string;
  projectId: string;
  version: number;
  filename: string;
  storagePath: string;
  rowCount: number;
  sha256: string;
  uploadedAt: string;
};

export type RunConfig = {
  id: string;
  projectId: string;
  name: string;
  promptText: string;
  promptVersion?: string;
  modelProvider: string;
  modelName: string;
  schema: JsonObject;
  thresholds: Thresholds;
  createdAt: string;
};

export type Run = {
  id: string;
  projectId: string;
  datasetId: string;
  runConfigId: string;
  triggerSource: "manual" | "ci";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  totalCases?: number;
  processedCases: number;
  costEstimateUsd?: number;
  errorMessage?: string;
  createdAt: string;
};

export type FailureRecord = {
  id: string;
  runId: string;
  testcaseId: string;
  failureType:
    | "schema_invalid"
    | "wrong_enum"
    | "field_mismatch"
    | "missing_field"
    | "timeout"
    | "provider_error"
    | "parse_error";
  input: Record<string, unknown>;
  expected: Record<string, unknown> | string | number | boolean;
  actual: Record<string, unknown> | null;
  diff: JsonObject;
  latencyMs: number;
  createdAt: string;
};

export type CaseResult = {
  id: string;
  runId: string;
  testcaseId: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown> | string | number | boolean;
  actual: Record<string, unknown> | null;
  schemaValid: boolean;
  enumCorrect: boolean | null;
  fieldAccuracy: number;
  latencyMs: number;
  errorType?: string;
  createdAt: string;
};

export type GateReason = {
  metric: string;
  actual: number;
  threshold: number;
  operator: ">=" | "<=";
  passed: boolean;
};

export type GateResult = {
  pass: boolean;
  reasons: GateReason[];
};

export type RunReport = {
  run_id: string;
  project_id: string;
  status: "completed" | "failed";
  pass: boolean;
  summary: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
  };
  metrics: {
    schema_valid_rate: number;
    enum_accuracy: number | null;
    field_level_accuracy: number;
    latency_p95_ms: number;
  };
  thresholds: Thresholds;
  gate_reasons: GateReason[];
  failures: Array<{
    testcase_id: string;
    failure_type: FailureRecord["failureType"];
    input: Record<string, unknown>;
    expected: Record<string, unknown> | string | number | boolean;
    actual: Record<string, unknown> | null;
    diff: JsonObject;
    latency_ms: number;
  }>;
  generated_at: string;
};

export type RunSummaryResponse = {
  runId: string;
  status: Run["status"];
  pass: boolean;
  metrics: RunReport["metrics"];
  gateReasons: string[];
  reportUrl?: string;
};

export type Job = {
  id: string;
  type: "eval_run";
  runId: string;
  status: "pending" | "leased" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  leasedAt?: string;
  leaseOwner?: string;
  errorMessage?: string;
  payload: EvalRunJobPayload;
  createdAt: string;
};

export type CiToken = {
  id: string;
  projectId: string;
  tokenHash: string;
  label?: string;
  lastUsedAt?: string;
  createdAt: string;
};
