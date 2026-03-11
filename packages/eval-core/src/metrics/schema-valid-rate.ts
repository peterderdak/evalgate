export function schemaValidRate(totalCases: number, validCases: number) {
  return totalCases === 0 ? 0 : Number((validCases / totalCases).toFixed(4));
}
