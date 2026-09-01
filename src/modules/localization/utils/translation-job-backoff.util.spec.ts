import {
  computeNextAttemptAt,
  computeTranslationJobBackoffMs,
} from './translation-job-backoff.util';

describe('translation job backoff', () => {
  it('uses bounded exponential backoff', () => {
    expect(computeTranslationJobBackoffMs(1)).toBe(30_000);
    expect(computeTranslationJobBackoffMs(3)).toBe(120_000);
    expect(computeTranslationJobBackoffMs(10)).toBe(15 * 60_000);
  });

  it('computes next attempt timestamps from attempt count', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const nextAttemptAt = computeNextAttemptAt(2, now);

    expect(nextAttemptAt.toISOString()).toBe('2026-01-01T00:01:00.000Z');
  });
});
