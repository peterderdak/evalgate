import { flattenObject } from "../utils/flatten.js";

function enumPaths(schema: Record<string, unknown>, prefix = ""): string[] {
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(properties).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child.enum)) {
      return [path];
    }
    if (child.type === "object") {
      return enumPaths(child, path);
    }
    return [];
  });
}

export function compareEnum(
  expected: Record<string, unknown>,
  actual: Record<string, unknown> | null,
  schema: Record<string, unknown>
) {
  const expectedFlat = flattenObject(expected);
  const actualFlat = actual ? flattenObject(actual) : {};
  const enumFieldPaths = enumPaths(schema);
  if (enumFieldPaths.length === 0) {
    return null;
  }

  const correct = enumFieldPaths.filter((path) => expectedFlat[path] === actualFlat[path]);
  return {
    correct: correct.length === enumFieldPaths.length,
    accuracy: correct.length / enumFieldPaths.length
  };
}
