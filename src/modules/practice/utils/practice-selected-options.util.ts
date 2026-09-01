import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';

export function normalizeSelectedOptionIds(rawOptionIds: readonly string[]): string[] {
  if (rawOptionIds.length === 0) {
    throw new Error('At least one selected option id is required.');
  }

  const normalizedIds = rawOptionIds.map((optionId) => {
    if (!isUuidV4(optionId)) {
      throw new Error('Selected option id must be a UUID v4.');
    }

    return normalizeUuid(optionId);
  });

  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error('Selected option ids must be unique.');
  }

  return [...normalizedIds].sort((left, right) => left.localeCompare(right));
}

export function serializeSelectedOptionIdsJson(optionIds: readonly string[]): string {
  return JSON.stringify(normalizeSelectedOptionIds(optionIds));
}

export function parseSelectedOptionIdsJson(rawJson: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    throw new Error('Selected option ids JSON is invalid.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Selected option ids JSON must be an array.');
  }

  return normalizeSelectedOptionIds(
    parsed.map((value) => {
      if (typeof value !== 'string') {
        throw new Error('Selected option ids JSON must contain strings.');
      }

      return value;
    }),
  );
}

export function selectedOptionSetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftNormalized = normalizeSelectedOptionIds(left);
  const rightNormalized = normalizeSelectedOptionIds(right);

  if (leftNormalized.length !== rightNormalized.length) {
    return false;
  }

  return leftNormalized.every((value, index) => value === rightNormalized[index]);
}
