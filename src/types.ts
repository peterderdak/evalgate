export type JsonObject = Record<string, unknown>;
export const RUN_REPORT_SCHEMA_VERSION = "1.0";

export type EvalCase = {
  id: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown> | string | number | boolean;
  metadata?: Record<string, unknown>;
};

export type Thresholds = {
  schema_valid_rate_min?: number;
  enum_accuracy_min?: number;
  field_level_accuracy_min?: number;
  latency_p95_max_ms?: number;
};

export const FAILURE_TYPES = [
  "schema_invalid",
  "wrong_enum",
  "field_mismatch",
  "missing_field",
  "timeout",
  "provider_error",
  "parse_error"
] as const;

export type FailureType = (typeof FAILURE_TYPES)[number];

export type FailureRecord = {
  id: string;
  runId: string;
  testcaseId: string;
  failureType: FailureType;
  input: Record<string, unknown>;
  expected: Record<string, unknown> | string | number | boolean;
  actual: Record<string, unknown> | null;
  diff: JsonObject;
  latencyMs: number;
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
  schema_version: string;
  tool_version: string | null;
  provider: string;
  model: string;
  prompt_version: string | null;
  dataset_path: string | null;
  dataset_sha256: string | null;
  config_sha256: string | null;
  git_sha: string | null;
  git_branch: string | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
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
  failure_counts_by_type: Record<FailureType, number>;
  failures: Array<{
    testcase_id: string;
    failure_type: FailureType;
    input: Record<string, unknown>;
    expected: Record<string, unknown> | string | number | boolean;
    actual: Record<string, unknown> | null;
    diff: JsonObject;
    latency_ms: number;
  }>;
  generated_at: string;
};

export const MAX_DATASET_CASES = 200;
export const MODEL_PROVIDERS = ["openai", "mock"] as const;

export function requiresProviderApiKey(provider: string) {
  return provider !== "mock";
}

export type RunReportContext = {
  schemaVersion?: string;
  toolVersion?: string | null;
  datasetPath?: string | null;
  datasetSha256?: string | null;
  configSha256?: string | null;
  gitSha?: string | null;
  gitBranch?: string | null;
};

export type RunEvaluationInput = {
  runId: string;
  projectId?: string;
  datasetPath?: string;
  cases?: EvalCase[];
  provider?: ModelProvider;
  providerTimeoutMs?: number;
  providerMaxRetries?: number;
  retryOnParseFailure?: boolean;
  reportContext?: RunReportContext;
  runConfig: {
    promptText: string;
    promptVersion?: string;
    modelProvider: string;
    modelName: string;
    schema: Record<string, unknown>;
    thresholds: Thresholds;
  };
  apiKey: string;
  onCaseProcessed?: (result: EvaluationCaseResult) => Promise<void> | void;
};

export type EvaluationCaseResult = {
  testcase: EvalCase;
  actual: Record<string, unknown> | null;
  rawText: string;
  schemaValid: boolean;
  validationErrors: string[];
  enumCorrect: boolean | null;
  fieldAccuracy: number;
  latencyMs: number;
  failure?: FailureRecord;
};

export type RunEvaluationOutput = {
  metrics: RunReport["metrics"];
  pass: boolean;
  failures: FailureRecord[];
  report: RunReport;
  gate: GateResult;
  caseResults: EvaluationCaseResult[];
  reportPath: string;
};

export type ModelInvokeParams = {
  apiKey: string;
  model: string;
  prompt: string;
  input: Record<string, unknown>;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
};

export type ModelInvokeResult = {
  rawText: string;
  parsedJson: Record<string, unknown> | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type ModelProvider = {
  invokeStructured(params: ModelInvokeParams): Promise<ModelInvokeResult>;
};
