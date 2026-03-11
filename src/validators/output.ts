export function parseStructuredOutput(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  try {
    return JSON.parse(rawText.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
