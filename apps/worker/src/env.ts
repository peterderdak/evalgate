export const workerEnv = {
  pollIntervalMs: Number(process.env.EVALGATE_WORKER_POLL_INTERVAL_MS ?? process.env.EVALGATE_CI_POLL_INTERVAL_MS ?? 3000),
  leaseTimeoutMs: Number(process.env.EVALGATE_JOB_LEASE_TIMEOUT_MS ?? 120000),
  providerTimeoutMs: Number(process.env.EVALGATE_PROVIDER_TIMEOUT_MS ?? 30000),
  providerMaxRetries: Number(process.env.EVALGATE_PROVIDER_MAX_RETRIES ?? 2),
  leaseOwner: process.env.HOSTNAME ?? "local-worker"
};
