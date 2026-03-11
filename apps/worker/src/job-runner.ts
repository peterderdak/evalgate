import { processNextPendingJob } from "../../../apps/web/lib/server/eval-service";

export async function runOneJob() {
  return processNextPendingJob("worker");
}
