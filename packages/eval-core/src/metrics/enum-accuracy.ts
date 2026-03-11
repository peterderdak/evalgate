export function enumAccuracy(enumCases: number, correctEnumCases: number) {
  if (enumCases === 0) {
    return null;
  }
  return Number((correctEnumCases / enumCases).toFixed(4));
}
