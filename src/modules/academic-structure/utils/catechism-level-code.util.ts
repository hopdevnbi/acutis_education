import { InvalidCatechismLevelCodeError } from '../errors/catechism-level.errors';

export const CATECHISM_LEVEL_CODE_MAX_LENGTH = 32;
export const CATECHISM_LEVEL_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeCatechismLevelCode(code: string): string {
  return code.trim().toLowerCase();
}

export function parseCatechismLevelCode(rawCode: string): string {
  const normalizedCode = normalizeCatechismLevelCode(rawCode);

  if (
    normalizedCode.length === 0 ||
    normalizedCode.length > CATECHISM_LEVEL_CODE_MAX_LENGTH ||
    !CATECHISM_LEVEL_CODE_PATTERN.test(normalizedCode)
  ) {
    throw new InvalidCatechismLevelCodeError();
  }

  return normalizedCode;
}
