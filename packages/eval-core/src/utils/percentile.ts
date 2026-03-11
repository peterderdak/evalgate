export function percentile(values: number[], rank: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1);
  return sorted[index];
}
