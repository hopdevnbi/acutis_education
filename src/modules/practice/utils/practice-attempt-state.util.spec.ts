import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import {
  derivePracticeQuestionAttemptState,
  isQuestionFinallyIncorrect,
  type PracticeAttemptRecord,
} from './practice-attempt-state.util';

function buildAttempt(input: {
  attemptNumber: number;
  isCorrect: boolean;
  clientAnswerId?: string;
}): PracticeAttemptRecord {
  return {
    id: `00000000-0000-4000-8000-00000000000${input.attemptNumber}`,
    attemptNumber: input.attemptNumber,
    clientAnswerId:
      input.clientAnswerId ?? `11111111-1111-4111-8111-11111111111${input.attemptNumber}`,
    selectedOptionIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    isCorrect: input.isCorrect,
    score: input.isCorrect ? 1 : 0,
    submittedAt: new Date(`2026-01-0${input.attemptNumber}T00:00:00.000Z`),
  };
}

describe('derivePracticeQuestionAttemptState', () => {
  const maxAttempts = 3;

  it('allows retry after first wrong attempt without feedback reveal', () => {
    const state = derivePracticeQuestionAttemptState({
      attempts: [buildAttempt({ attemptNumber: 1, isCorrect: false })],
      maxAttemptsPerQuestion: maxAttempts,
      sessionStatus: PracticeSessionStatus.InProgress,
    });

    expect(state.attemptCount).toBe(1);
    expect(state.finalized).toBe(false);
    expect(state.canRetry).toBe(true);
    expect(state.remainingAttempts).toBe(2);
    expect(state.feedbackRevealed).toBe(false);
  });

  it('finalizes immediately on first correct attempt with feedback reveal', () => {
    const state = derivePracticeQuestionAttemptState({
      attempts: [buildAttempt({ attemptNumber: 1, isCorrect: true })],
      maxAttemptsPerQuestion: maxAttempts,
      sessionStatus: PracticeSessionStatus.InProgress,
    });

    expect(state.finalized).toBe(true);
    expect(state.canRetry).toBe(false);
    expect(state.remainingAttempts).toBe(2);
    expect(state.feedbackRevealed).toBe(true);
    expect(state.finalCorrect).toBe(true);
  });

  it('finalizes after max wrong attempts with feedback reveal', () => {
    const state = derivePracticeQuestionAttemptState({
      attempts: [
        buildAttempt({ attemptNumber: 1, isCorrect: false }),
        buildAttempt({ attemptNumber: 2, isCorrect: false }),
        buildAttempt({ attemptNumber: 3, isCorrect: false }),
      ],
      maxAttemptsPerQuestion: maxAttempts,
      sessionStatus: PracticeSessionStatus.InProgress,
    });

    expect(state.finalized).toBe(true);
    expect(state.canRetry).toBe(false);
    expect(state.remainingAttempts).toBe(0);
    expect(state.feedbackRevealed).toBe(true);
    expect(state.finalCorrect).toBe(false);
  });

  it('reveals feedback for all questions when session is completed', () => {
    const state = derivePracticeQuestionAttemptState({
      attempts: [buildAttempt({ attemptNumber: 1, isCorrect: false })],
      maxAttemptsPerQuestion: maxAttempts,
      sessionStatus: PracticeSessionStatus.Completed,
    });

    expect(state.finalized).toBe(false);
    expect(state.feedbackRevealed).toBe(true);
  });
});

describe('isQuestionFinallyIncorrect', () => {
  it('returns false when question was eventually answered correctly', () => {
    const finallyIncorrect = isQuestionFinallyIncorrect(
      [
        buildAttempt({ attemptNumber: 1, isCorrect: false }),
        buildAttempt({ attemptNumber: 2, isCorrect: true }),
      ],
      3,
    );

    expect(finallyIncorrect).toBe(false);
  });

  it('returns true when final outcome is incorrect', () => {
    const finallyIncorrect = isQuestionFinallyIncorrect(
      [
        buildAttempt({ attemptNumber: 1, isCorrect: false }),
        buildAttempt({ attemptNumber: 2, isCorrect: false }),
        buildAttempt({ attemptNumber: 3, isCorrect: false }),
      ],
      3,
    );

    expect(finallyIncorrect).toBe(true);
  });
});
