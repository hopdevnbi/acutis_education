import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ExamAnswerInvalidError } from '../errors/exam.errors';

export function normalizeExamSelectedOptionIds(rawOptionIds: readonly string[]): string[] {
  if (rawOptionIds.length === 0) {
    throw new ExamAnswerInvalidError();
  }

  const normalizedIds = rawOptionIds.map((optionId) => {
    if (!isUuidV4(optionId)) {
      throw new ExamAnswerInvalidError();
    }

    return normalizeUuid(optionId);
  });

  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new ExamAnswerInvalidError();
  }

  return [...normalizedIds].sort((left, right) => left.localeCompare(right));
}

export function serializeExamSelectedOptionIdsJson(optionIds: readonly string[]): string {
  return JSON.stringify(normalizeExamSelectedOptionIds(optionIds));
}

export function parseExamSelectedOptionIdsJson(rawJson: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    throw new ExamAnswerInvalidError();
  }

  if (!Array.isArray(parsed)) {
    throw new ExamAnswerInvalidError();
  }

  return normalizeExamSelectedOptionIds(
    parsed.map((value) => {
      if (typeof value !== 'string') {
        throw new ExamAnswerInvalidError();
      }

      return value;
    }),
  );
}

export function examSelectedOptionSetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftNormalized = normalizeExamSelectedOptionIds(left);
  const rightNormalized = normalizeExamSelectedOptionIds(right);

  if (leftNormalized.length !== rightNormalized.length) {
    return false;
  }

  return leftNormalized.every((value, index) => value === rightNormalized[index]);
}
