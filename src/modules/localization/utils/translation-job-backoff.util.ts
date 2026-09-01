export function computeTranslationJobBackoffMs(attemptCount: number): number {
  const boundedAttempt = Math.max(1, attemptCount);
  const baseDelayMs = 30_000;

  return Math.min(baseDelayMs * 2 ** (boundedAttempt - 1), 15 * 60_000);
}

export function computeNextAttemptAt(attemptCount: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + computeTranslationJobBackoffMs(attemptCount));
}
