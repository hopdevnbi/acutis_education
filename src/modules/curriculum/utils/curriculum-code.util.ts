import { InvalidCurriculumCodeError } from '../errors/curriculum.errors';

export const CURRICULUM_CODE_MAX_LENGTH = 32;
export const CURRICULUM_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeCurriculumCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidCurriculumCode(code: string): boolean {
  return (
    code.length > 0 &&
    code.length <= CURRICULUM_CODE_MAX_LENGTH &&
    CURRICULUM_CODE_PATTERN.test(code)
  );
}

export function parseCurriculumCode(rawCode: string): string {
  const normalizedCode = normalizeCurriculumCode(rawCode);

  if (!isValidCurriculumCode(normalizedCode)) {
    throw new InvalidCurriculumCodeError();
  }

  return normalizedCode;
}
