import { describe, expect, it } from "vitest";

import { validateSchemaOutput } from "../src/validators/schema";

describe("schema validation", () => {
  it("validates matching JSON objects", () => {
    const result = validateSchemaOutput(
      {
        type: "object",
        properties: {
          category: { type: "string", enum: ["billing", "refund"] }
        },
        required: ["category"],
        additionalProperties: false
      },
      { category: "billing" }
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns errors for invalid output", () => {
    const result = validateSchemaOutput(
      {
        type: "object",
        properties: {
          category: { type: "string" }
        },
        required: ["category"],
        additionalProperties: false
      },
      {}
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
