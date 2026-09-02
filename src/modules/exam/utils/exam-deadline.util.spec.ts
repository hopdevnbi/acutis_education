import { computeExamAttemptDeadlineAt } from './exam-deadline.util';

describe('exam-deadline.util', () => {
  it('uses duration deadline when before assignment close', () => {
    const startedAt = new Date('2026-09-15T08:00:00.000Z');
    const closesAt = new Date('2026-09-15T12:00:00.000Z');

    expect(computeExamAttemptDeadlineAt(startedAt, 45, closesAt).toISOString()).toBe(
      '2026-09-15T08:45:00.000Z',
    );
  });

  it('caps deadline at assignment close', () => {
    const startedAt = new Date('2026-09-15T08:00:00.000Z');
    const closesAt = new Date('2026-09-15T08:30:00.000Z');

    expect(computeExamAttemptDeadlineAt(startedAt, 45, closesAt).toISOString()).toBe(
      '2026-09-15T08:30:00.000Z',
    );
  });
});
