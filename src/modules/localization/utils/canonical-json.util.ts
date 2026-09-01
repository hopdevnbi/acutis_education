function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const sortedRecord: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    sortedRecord[key] = sortValue(record[key]);
  }

  return sortedRecord;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
