import { describe, expect, it } from "vitest";

import { getCliTemplate, parseCliConfig } from "../src/cli-config.js";

describe("cli config", () => {
  it("returns the ticket-triage starter template", () => {
    const template = getCliTemplate("ticket-triage");

    expect(template.modelProvider).toBe("mock");
    expect(template.schema).toHaveProperty("properties");
    expect(template.thresholds.enum_accuracy_min).toBe(0.9);
  });

  it("parses a valid config object", () => {
    const config = parseCliConfig({
      promptText: "Classify the ticket.",
      modelProvider: "mock",
      modelName: "mock-classifier",
      schema: {
        type: "object"
      },
      thresholds: {}
    });

    expect(config.modelProvider).toBe("mock");
    expect(config.modelName).toBe("mock-classifier");
  });
});
