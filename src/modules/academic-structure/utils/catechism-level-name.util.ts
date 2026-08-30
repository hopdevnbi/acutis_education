import { InvalidCatechismLevelNameError } from '../errors/catechism-level.errors';

export const CATECHISM_LEVEL_NAME_MAX_LENGTH = 128;

export function parseCatechismLevelName(rawName: string): string {
  const normalizedName = rawName.trim();

  if (normalizedName.length === 0 || normalizedName.length > CATECHISM_LEVEL_NAME_MAX_LENGTH) {
    throw new InvalidCatechismLevelNameError();
  }

  return normalizedName;
}
