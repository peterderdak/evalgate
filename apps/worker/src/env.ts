export const workerEnv = {
  pollIntervalMs: Number(process.env.EVALGATE_CI_POLL_INTERVAL_MS ?? 3000),
  leaseOwner: process.env.HOSTNAME ?? "local-worker"
};
