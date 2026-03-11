export function flattenObject(
  value: Record<string, unknown>,
  prefix = ""
): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(output, flattenObject(child as Record<string, unknown>, path));
    } else {
      output[path] = child as string | number | boolean | null;
    }
  }

  return output;
}
