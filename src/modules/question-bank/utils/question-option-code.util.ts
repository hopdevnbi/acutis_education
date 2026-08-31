import { InvalidQuestionOptionCodeError } from '../errors/question-bank.errors';

export const QUESTION_OPTION_CODE_MAX_LENGTH = 32;
export const QUESTION_OPTION_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeQuestionOptionCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidQuestionOptionCode(code: string): boolean {
  return (
    code.length > 0 &&
    code.length <= QUESTION_OPTION_CODE_MAX_LENGTH &&
    QUESTION_OPTION_CODE_PATTERN.test(code)
  );
}

export function parseQuestionOptionCode(rawCode: string | null | undefined): string | null {
  if (rawCode === undefined || rawCode === null) {
    return null;
  }

  const normalizedCode = normalizeQuestionOptionCode(rawCode);

  if (normalizedCode.length === 0) {
    return null;
  }

  if (!isValidQuestionOptionCode(normalizedCode)) {
    throw new InvalidQuestionOptionCodeError();
  }

  return normalizedCode;
}
