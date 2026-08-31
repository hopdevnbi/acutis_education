import { InvalidQuestionCodeError } from '../errors/question-bank.errors';

export const QUESTION_CODE_MAX_LENGTH = 64;
export const QUESTION_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeQuestionCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidQuestionCode(code: string): boolean {
  return (
    code.length > 0 && code.length <= QUESTION_CODE_MAX_LENGTH && QUESTION_CODE_PATTERN.test(code)
  );
}

export function parseQuestionCode(rawCode: string | null | undefined): string | null {
  if (rawCode === undefined || rawCode === null) {
    return null;
  }

  const normalizedCode = normalizeQuestionCode(rawCode);

  if (normalizedCode.length === 0) {
    return null;
  }

  if (!isValidQuestionCode(normalizedCode)) {
    throw new InvalidQuestionCodeError();
  }

  return normalizedCode;
}
