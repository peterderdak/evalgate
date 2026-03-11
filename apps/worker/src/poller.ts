import { workerEnv } from "./env";
import { runOneJob } from "./job-runner";

export async function startPoller() {
  for (;;) {
    await runOneJob();
    await new Promise((resolve) => setTimeout(resolve, workerEnv.pollIntervalMs));
  }
}
