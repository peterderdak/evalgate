import { describe, expect, it } from "vitest";

import { enumAccuracy } from "../src/metrics/enum-accuracy";
import { fieldLevelAccuracy } from "../src/metrics/field-level-accuracy";
import { latencyP95 } from "../src/metrics/latency-p95";
import { schemaValidRate } from "../src/metrics/schema-valid-rate";
import { flattenObject } from "../src/utils/flatten";

describe("metrics", () => {
  it("computes schema valid rate", () => {
    expect(schemaValidRate(10, 9)).toBe(0.9);
  });

  it("computes enum accuracy", () => {
    expect(enumAccuracy(5, 4)).toBe(0.8);
  });

  it("computes field level accuracy", () => {
    expect(fieldLevelAccuracy(9, 10)).toBe(0.9);
  });

  it("computes latency p95 with nearest-rank", () => {
    expect(latencyP95([100, 200, 300, 400, 500])).toBe(500);
  });

  it("flattens nested objects with dot paths", () => {
    expect(flattenObject({ customer: { plan: "pro" } })).toEqual({ "customer.plan": "pro" });
  });
});
