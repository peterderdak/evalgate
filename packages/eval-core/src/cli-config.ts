import { readFile } from "node:fs/promises";

import type { Thresholds } from "./types.js";

export type EvalgateCliConfig = {
  name?: string;
  promptText: string;
  promptVersion?: string;
  modelProvider: string;
  modelName: string;
  schema: Record<string, unknown>;
  thresholds: Thresholds;
};

const ticketTriageTemplate: EvalgateCliConfig = {
  name: "Support Ticket Classifier",
  promptText:
    "Classify the support ticket into exactly one category: billing, refund, cancellation, technical, or unknown. Return valid JSON only.",
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
    schema_valid_rate_min: 0.95,
    enum_accuracy_min: 0.9,
    field_level_accuracy_min: 0.9,
    latency_p95_max_ms: 2500
  }
};

const templates: Record<string, EvalgateCliConfig> = {
  "ticket-triage": ticketTriageTemplate
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid config: ${field} must be a non-empty string`);
  }
}

function assertRecord(value: unknown, field: string) {
  if (!isRecord(value)) {
    throw new Error(`Invalid config: ${field} must be an object`);
  }
}

export function parseCliConfig(input: unknown): EvalgateCliConfig {
  if (!isRecord(input)) {
    throw new Error("Invalid config: expected a JSON object");
  }

  assertString(input.promptText, "promptText");
  assertString(input.modelProvider, "modelProvider");
  assertString(input.modelName, "modelName");
  assertRecord(input.schema, "schema");
  assertRecord(input.thresholds, "thresholds");

  if (input.name !== undefined) {
    assertString(input.name, "name");
  }
  if (input.promptVersion !== undefined) {
    assertString(input.promptVersion, "promptVersion");
  }

  return {
    name: input.name as string | undefined,
    promptText: input.promptText as string,
    promptVersion: input.promptVersion as string | undefined,
    modelProvider: input.modelProvider as string,
    modelName: input.modelName as string,
    schema: input.schema as Record<string, unknown>,
    thresholds: input.thresholds as Thresholds
  };
}

export async function loadCliConfig(configPath: string) {
  const text = await readFile(configPath, "utf8");
  return parseCliConfig(JSON.parse(text) as unknown);
}

export function getCliTemplate(templateName: string) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Unknown template "${templateName}". Available templates: ${listCliTemplates().join(", ")}`);
  }

  return template;
}

export function listCliTemplates() {
  return Object.keys(templates);
}
