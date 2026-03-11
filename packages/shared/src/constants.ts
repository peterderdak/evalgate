export const MAX_DATASET_CASES = 200;
export const DATASET_CONTENT_TYPES = ["application/x-ndjson", "text/plain"];
export const DATASET_FILE_EXTENSION = ".jsonl";
export const MODEL_PROVIDERS = ["openai", "mock"] as const;
export const JOB_TYPE_EVAL_RUN = "eval_run";
export const JOB_STATUS = {
  pending: "pending",
  leased: "leased",
  completed: "completed",
  failed: "failed"
} as const;
export const RUN_STATUS = {
  queued: "queued",
  running: "running",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled"
} as const;

export function requiresProviderApiKey(provider: string) {
  return provider !== "mock";
}
