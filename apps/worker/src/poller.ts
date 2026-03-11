import { workerEnv } from "./env";
import { runOneJob } from "./job-runner";

export async function pollOnce() {
  try {
    await runOneJob();
    return true;
  } catch (error) {
    console.error("[evalgate-worker] job execution failed", error);
    return false;
  }
}

export async function startPoller() {
  for (;;) {
    await pollOnce();
    await new Promise((resolve) => setTimeout(resolve, workerEnv.pollIntervalMs));
  }
}
