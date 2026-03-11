export type JsonObject = Record<string, unknown>;

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

export type FailureType =
  | "schema_invalid"
  | "wrong_enum"
  | "field_mismatch"
  | "missing_field"
  | "timeout"
  | "provider_error"
  | "parse_error";

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

export type RunEvaluationInput = {
  runId: string;
  projectId?: string;
  datasetPath?: string;
  cases?: EvalCase[];
  provider?: ModelProvider;
  providerTimeoutMs?: number;
  providerMaxRetries?: number;
  retryOnParseFailure?: boolean;
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
