import { InvalidExamCodeError } from '../errors/exam.errors';

export const EXAM_CODE_MAX_LENGTH = 32;
export const EXAM_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeExamCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidExamCode(code: string): boolean {
  return code.length > 0 && code.length <= EXAM_CODE_MAX_LENGTH && EXAM_CODE_PATTERN.test(code);
}

export function parseExamCode(rawCode: string): string {
  const normalizedCode = normalizeExamCode(rawCode);

  if (!isValidExamCode(normalizedCode)) {
    throw new InvalidExamCodeError();
  }

  return normalizedCode;
}
