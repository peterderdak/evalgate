import type { ModelProvider } from "../types.js";

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => collectText(item));
  }
  return [];
}

function hashText(text: string) {
  let hash = 0;
  for (const character of text) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function classifyEnum(text: string, values: unknown[]) {
  const enumValues = values.filter((value): value is string => typeof value === "string");
  if (enumValues.length === 0) {
    return values[0] ?? null;
  }

  const rules: Array<{ label: string; keywords: string[] }> = [
    { label: "refund", keywords: ["refund", "money back", "reimburse"] },
    { label: "billing", keywords: ["bill", "billing", "invoice", "charged", "charge", "payment"] },
    { label: "cancellation", keywords: ["cancel", "cancellation", "unsubscribe", "subscription"] },
    { label: "technical", keywords: ["technical", "error", "bug", "broken", "login", "crash", "issue", "unable"] },
    { label: "unknown", keywords: [] }
  ];

  for (const rule of rules) {
    if (!enumValues.includes(rule.label)) {
      continue;
    }
    if (rule.keywords.length === 0 || rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.label;
    }
  }

  return enumValues[0];
}

function inferScalar(
  key: string,
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
  inputText: string
) {
  if (schema.const !== undefined) {
    return schema.const;
  }
  if (schema.default !== undefined) {
    return schema.default;
  }
  if (Array.isArray(schema.enum)) {
    return classifyEnum(inputText, schema.enum);
  }

  const directValue = input[key];
  switch (schema.type) {
    case "string":
      return typeof directValue === "string" ? directValue : inputText || "mock";
    case "integer":
      return typeof directValue === "number" ? Math.trunc(directValue) : 0;
    case "number":
      return typeof directValue === "number" ? directValue : 0;
    case "boolean":
      return typeof directValue === "boolean" ? directValue : false;
    default:
      return null;
  }
}

function buildMockValue(
  key: string,
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
  inputText: string
): unknown {
  if (schema.type === "object") {
    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    return Object.fromEntries(
      Object.entries(properties).map(([childKey, childSchema]) => [
        childKey,
        buildMockValue(childKey, childSchema, input, inputText)
      ])
    );
  }

  return inferScalar(key, schema, input, inputText);
}

export const mockProvider: ModelProvider = {
  async invokeStructured(params) {
    const inputText = collectText(params.input).join(" ").toLowerCase();
    const simulatedLatencyMs = 20 + (hashText(inputText) % 25);
    await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));

    const candidate = buildMockValue("", params.schema, params.input, inputText);
    const parsedJson =
      candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? (candidate as Record<string, unknown>)
        : { value: candidate };
    const rawText = JSON.stringify(parsedJson);

    return {
      rawText,
      parsedJson,
      usage: {
        inputTokens: Math.max(1, Math.ceil(inputText.length / 4)),
        outputTokens: Math.max(1, Math.ceil(rawText.length / 4))
      }
    };
  }
};
