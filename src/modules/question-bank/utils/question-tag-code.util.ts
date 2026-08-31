import { InvalidQuestionTagCodeError } from '../errors/question-bank.errors';

export const QUESTION_TAG_CODE_MAX_LENGTH = 64;
export const QUESTION_TAG_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeQuestionTagCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidQuestionTagCode(code: string): boolean {
  return (
    code.length > 0 &&
    code.length <= QUESTION_TAG_CODE_MAX_LENGTH &&
    QUESTION_TAG_CODE_PATTERN.test(code)
  );
}

export function parseQuestionTagCode(rawCode: string): string {
  const normalizedCode = normalizeQuestionTagCode(rawCode);

  if (!isValidQuestionTagCode(normalizedCode)) {
    throw new InvalidQuestionTagCodeError();
  }

  return normalizedCode;
}
