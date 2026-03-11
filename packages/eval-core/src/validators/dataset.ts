import { readFile } from "node:fs/promises";

import { MAX_DATASET_CASES } from "@evalgate/shared";
import type { EvalCase } from "@evalgate/shared";

export async function loadDataset(datasetPath: string) {
  const text = await readFile(datasetPath, "utf8");
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    throw new Error("Dataset is empty");
  }

  if (rows.length > MAX_DATASET_CASES) {
    throw new Error(`Dataset exceeds ${MAX_DATASET_CASES} cases`);
  }

  return rows.map((line, index) => {
    const parsed = JSON.parse(line) as Partial<EvalCase>;
    if (!parsed.input || parsed.expected === undefined) {
      throw new Error(`Dataset line ${index + 1} must include input and expected`);
    }
    return {
      id: parsed.id ?? `case_${String(index + 1).padStart(3, "0")}`,
      input: parsed.input,
      expected: parsed.expected,
      metadata: parsed.metadata
    } satisfies EvalCase;
  });
}
