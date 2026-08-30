import { InvalidLessonCodeError } from '../errors/lesson.errors';

export const LESSON_CODE_MAX_LENGTH = 32;
export const LESSON_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseLessonCode(rawCode: string | null | undefined): string | null {
  if (rawCode === undefined || rawCode === null) {
    return null;
  }

  const code = rawCode.trim().toLowerCase();

  if (code.length === 0) {
    return null;
  }

  if (code.length > LESSON_CODE_MAX_LENGTH || !LESSON_CODE_PATTERN.test(code)) {
    throw new InvalidLessonCodeError();
  }

  return code;
}
