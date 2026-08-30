import {
  InvalidLessonDurationError,
  InvalidLessonSummaryError,
  InvalidLessonTitleError,
} from '../errors/lesson.errors';

export const LESSON_TITLE_MAX_LENGTH = 256;
export const LESSON_SUMMARY_MAX_LENGTH = 1024;
export const LESSON_DURATION_MIN_MINUTES = 1;
export const LESSON_DURATION_MAX_MINUTES = 1440;

export function parseLessonTitle(rawTitle: string): string {
  const title = rawTitle.trim();

  if (title.length === 0 || title.length > LESSON_TITLE_MAX_LENGTH) {
    throw new InvalidLessonTitleError();
  }

  return title;
}

export function parseLessonSummary(rawSummary: string | null | undefined): string | null {
  if (rawSummary === undefined || rawSummary === null) {
    return null;
  }

  const summary = rawSummary.trim();

  if (summary.length === 0) {
    return null;
  }

  if (summary.length > LESSON_SUMMARY_MAX_LENGTH) {
    throw new InvalidLessonSummaryError();
  }

  return summary;
}

export function parseEstimatedDurationMinutes(
  rawDuration: number | null | undefined,
): number | null {
  if (rawDuration === undefined || rawDuration === null) {
    return null;
  }

  if (
    !Number.isInteger(rawDuration) ||
    rawDuration < LESSON_DURATION_MIN_MINUTES ||
    rawDuration > LESSON_DURATION_MAX_MINUTES
  ) {
    throw new InvalidLessonDurationError();
  }

  return rawDuration;
}
