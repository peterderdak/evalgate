import { percentile } from "../utils/percentile.js";

export function latencyP95(latencies: number[]) {
  return percentile(latencies, 95);
}
