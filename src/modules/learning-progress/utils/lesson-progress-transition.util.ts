import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';
import type { LessonProgressTargetStatus } from '../enums/lesson-progress-status.enum';
import { LessonProgressInvalidTransitionError } from '../errors/learning-progress.errors';

export function assertLessonProgressTransition(
  currentStatus: LessonProgressStatus,
  targetStatus: LessonProgressTargetStatus,
): void {
  if (currentStatus === LessonProgressStatus.NotStarted) {
    if (
      targetStatus === LessonProgressStatus.InProgress ||
      targetStatus === LessonProgressStatus.Completed
    ) {
      return;
    }

    throw new LessonProgressInvalidTransitionError();
  }

  if (currentStatus === LessonProgressStatus.InProgress) {
    if (
      targetStatus === LessonProgressStatus.InProgress ||
      targetStatus === LessonProgressStatus.Completed
    ) {
      return;
    }

    throw new LessonProgressInvalidTransitionError();
  }

  if (currentStatus === LessonProgressStatus.Completed) {
    if (targetStatus === LessonProgressStatus.Completed) {
      return;
    }

    throw new LessonProgressInvalidTransitionError();
  }

  throw new LessonProgressInvalidTransitionError();
}

export function isLessonProgressTransitionNoop(
  currentStatus: LessonProgressStatus,
  targetStatus: LessonProgressTargetStatus,
): boolean {
  return currentStatus === targetStatus;
}
