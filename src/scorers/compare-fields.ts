import { flattenObject } from "../utils/flatten.js";

export function compareFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown> | null
) {
  const expectedFlat = flattenObject(expected);
  const actualFlat = actual ? flattenObject(actual) : {};
  const keys = Object.keys(expectedFlat);
  const matched = keys.filter((key) => expectedFlat[key] === actualFlat[key]);
  return {
    matchedFields: matched.length,
    totalFields: keys.length,
    accuracy: keys.length === 0 ? 0 : matched.length / keys.length,
    expectedFlat,
    actualFlat
  };
}
