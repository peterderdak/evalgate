import type {
  EvalCase,
  FailureRecord,
  GateResult,
  RunReport,
  Thresholds
} from "@evalgate/shared";

export type RunEvaluationInput = {
  runId: string;
  projectId: string;
  datasetPath: string;
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
