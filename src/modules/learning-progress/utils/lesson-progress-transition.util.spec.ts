import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';
import { LessonProgressInvalidTransitionError } from '../errors/learning-progress.errors';
import {
  assertLessonProgressTransition,
  isLessonProgressTransitionNoop,
} from './lesson-progress-transition.util';

describe('lesson-progress-transition.util', () => {
  it('allows missing to IN_PROGRESS', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.NotStarted,
        LessonProgressStatus.InProgress,
      ),
    ).not.toThrow();
  });

  it('allows missing to COMPLETED', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.NotStarted,
        LessonProgressStatus.Completed,
      ),
    ).not.toThrow();
  });

  it('allows IN_PROGRESS to IN_PROGRESS idempotently', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.InProgress,
        LessonProgressStatus.InProgress,
      ),
    ).not.toThrow();
    expect(
      isLessonProgressTransitionNoop(
        LessonProgressStatus.InProgress,
        LessonProgressStatus.InProgress,
      ),
    ).toBe(true);
  });

  it('allows IN_PROGRESS to COMPLETED', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.InProgress,
        LessonProgressStatus.Completed,
      ),
    ).not.toThrow();
  });

  it('allows COMPLETED to COMPLETED idempotently', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.Completed,
        LessonProgressStatus.Completed,
      ),
    ).not.toThrow();
  });

  it('denies COMPLETED to IN_PROGRESS', () => {
    expect(() =>
      assertLessonProgressTransition(
        LessonProgressStatus.Completed,
        LessonProgressStatus.InProgress,
      ),
    ).toThrow(LessonProgressInvalidTransitionError);
  });
});
