import { describe, expect, it } from "vitest";

import { runEvaluation } from "../src/runner.js";

describe("runEvaluation", () => {
  it("generates a passing report with the mock provider", async () => {
    const result = await runEvaluation({
      runId: "run_mock",
      projectId: "proj_mock",
      apiKey: "",
      cases: [
        {
          id: "case_001",
          input: {
            ticket_text: "Customer says they were double charged on their last invoice"
          },
          expected: {
            category: "billing"
          }
        },
        {
          id: "case_002",
          input: {
            ticket_text: "Please cancel my subscription immediately"
          },
          expected: {
            category: "cancellation"
          }
        },
        {
          id: "case_003",
          input: {
            ticket_text: "Refund me now for this mistaken purchase"
          },
          expected: {
            category: "refund"
          }
        }
      ],
      runConfig: {
        promptText: "Classify support tickets into the configured enum.",
        modelProvider: "mock",
        modelName: "mock-classifier",
        schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["billing", "refund", "cancellation", "technical", "unknown"]
            }
          },
          required: ["category"],
          additionalProperties: false
        },
        thresholds: {
          schema_valid_rate_min: 1,
          enum_accuracy_min: 1,
          field_level_accuracy_min: 1,
          latency_p95_max_ms: 100
        }
      }
    });

    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.report.summary.total_cases).toBe(3);
    expect(result.report.metrics.schema_valid_rate).toBe(1);
    expect(result.report.metrics.enum_accuracy).toBe(1);
    expect(result.report.metrics.field_level_accuracy).toBe(1);
    expect(result.report.metrics.latency_p95_ms).toBeGreaterThanOrEqual(1);
  });
});
