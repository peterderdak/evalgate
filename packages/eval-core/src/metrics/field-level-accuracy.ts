export function fieldLevelAccuracy(matchedFields: number, totalFields: number) {
  return totalFields === 0 ? 0 : Number((matchedFields / totalFields).toFixed(4));
}
