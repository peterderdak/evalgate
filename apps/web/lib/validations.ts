import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  templateType: z.string().min(2),
  defaultSchema: z.record(z.unknown()).optional(),
  defaultThresholds: z
    .object({
      schema_valid_rate_min: z.number().min(0).max(1).optional(),
      enum_accuracy_min: z.number().min(0).max(1).optional(),
      field_level_accuracy_min: z.number().min(0).max(1).optional(),
      latency_p95_max_ms: z.number().int().positive().optional()
    })
    .optional()
});

export const createRunConfigSchema = z.object({
  name: z.string().min(2),
  promptText: z.string().min(2),
  promptVersion: z.string().optional(),
  modelProvider: z.string().min(2),
  modelName: z.string().min(2),
  schema: z.record(z.unknown()),
  thresholds: z.object({
    schema_valid_rate_min: z.number().min(0).max(1).optional(),
    enum_accuracy_min: z.number().min(0).max(1).optional(),
    field_level_accuracy_min: z.number().min(0).max(1).optional(),
    latency_p95_max_ms: z.number().int().positive().optional()
  })
});

export const startRunSchema = z.object({
  datasetId: z.string().min(1),
  runConfigId: z.string().min(1),
  apiKey: z.string().min(1)
});

export const startCiRunSchema = startRunSchema.extend({
  pullRequest: z
    .object({
      number: z.number().int().positive(),
      sha: z.string().min(1),
      branch: z.string().min(1)
    })
    .optional()
});
