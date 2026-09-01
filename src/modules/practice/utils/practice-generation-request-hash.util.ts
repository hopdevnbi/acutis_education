import { createHash } from 'node:crypto';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import type { NormalizedPracticeGenerationRequest } from '../interfaces/practice.interface';

export const PRACTICE_REVIEW_WRONG_OPERATION = 'REVIEW_WRONG' as const;

function stableStringArray(values: readonly string[]): string {
  return [...values].sort().join(',');
}

export function computePracticeGenerationRequestHash(
  request: NormalizedPracticeGenerationRequest,
  resolvedCurriculumId: string,
): string {
  const payload = [
    request.locale,
    resolvedCurriculumId,
    request.canonicalLessonKey ?? '',
    stableStringArray(request.tagIds),
    stableStringArray(request.tagCodes),
    stableStringArray(request.questionTypes),
    request.difficulty ?? '',
    String(request.questionCount),
    request.randomizeQuestions ? '1' : '0',
    request.randomizeOptions ? '1' : '0',
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

export function computePracticeReviewWrongRequestHash(rawSourceSessionId: string): string {
  const payload = `${PRACTICE_REVIEW_WRONG_OPERATION}|${normalizeUuid(rawSourceSessionId)}`;

  return createHash('sha256').update(payload).digest('hex');
}
