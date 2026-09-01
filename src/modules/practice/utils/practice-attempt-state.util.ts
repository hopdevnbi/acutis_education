import type { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionStatus as PracticeSessionStatusEnum } from '../enums/practice-session-status.enum';

export interface PracticeAttemptRecord {
  readonly id: string;
  readonly attemptNumber: number;
  readonly clientAnswerId: string;
  readonly selectedOptionIds: readonly string[];
  readonly isCorrect: boolean;
  readonly score: number;
  readonly submittedAt: Date;
}

export interface DerivedPracticeQuestionAttemptState {
  readonly attemptCount: number;
  readonly latestAttempt: PracticeAttemptRecord | null;
  readonly finalized: boolean;
  readonly canRetry: boolean;
  readonly remainingAttempts: number;
  readonly finalCorrect: boolean;
  readonly feedbackRevealed: boolean;
}

export function derivePracticeQuestionAttemptState(input: {
  readonly attempts: readonly PracticeAttemptRecord[];
  readonly maxAttemptsPerQuestion: number;
  readonly sessionStatus: PracticeSessionStatus;
}): DerivedPracticeQuestionAttemptState {
  const sortedAttempts = [...input.attempts].sort(
    (left, right) => left.attemptNumber - right.attemptNumber,
  );
  const attemptCount = sortedAttempts.length;
  const latestAttempt = sortedAttempts.at(-1) ?? null;
  const sessionCompleted = input.sessionStatus === PracticeSessionStatusEnum.Completed;
  const finalized =
    latestAttempt !== null &&
    (latestAttempt.isCorrect || attemptCount >= input.maxAttemptsPerQuestion);
  const finalCorrect = latestAttempt?.isCorrect === true;
  const remainingAttempts = Math.max(0, input.maxAttemptsPerQuestion - attemptCount);
  const canRetry = !finalized && remainingAttempts > 0;
  const feedbackRevealed = finalized || sessionCompleted;

  return {
    attemptCount,
    latestAttempt,
    finalized,
    canRetry,
    remainingAttempts,
    finalCorrect,
    feedbackRevealed,
  };
}

export function isQuestionFinallyIncorrect(
  attempts: readonly PracticeAttemptRecord[],
  maxAttemptsPerQuestion: number,
): boolean {
  const state = derivePracticeQuestionAttemptState({
    attempts,
    maxAttemptsPerQuestion,
    sessionStatus: PracticeSessionStatusEnum.Completed,
  });

  return state.finalized && !state.finalCorrect;
}
