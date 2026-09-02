import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import {
  resolveExamAssignmentEffectiveStatus,
  resolveInitialExamAssignmentStatus,
} from './exam-assignment-status.util';

describe('exam-assignment-status.util', () => {
  const opensAt = new Date('2026-09-15T08:00:00.000Z');
  const closesAt = new Date('2026-09-15T10:00:00.000Z');

  it('resolves scheduled before opensAt', () => {
    expect(
      resolveExamAssignmentEffectiveStatus(
        ExamAssignmentStatus.Scheduled,
        opensAt,
        closesAt,
        new Date('2026-09-15T07:00:00.000Z'),
      ),
    ).toBe(ExamAssignmentStatus.Scheduled);
  });

  it('resolves open within window', () => {
    expect(
      resolveExamAssignmentEffectiveStatus(
        ExamAssignmentStatus.Scheduled,
        opensAt,
        closesAt,
        new Date('2026-09-15T09:00:00.000Z'),
      ),
    ).toBe(ExamAssignmentStatus.Open);
  });

  it('resolves closed after closesAt', () => {
    expect(
      resolveExamAssignmentEffectiveStatus(
        ExamAssignmentStatus.Open,
        opensAt,
        closesAt,
        new Date('2026-09-15T11:00:00.000Z'),
      ),
    ).toBe(ExamAssignmentStatus.Closed);
  });

  it('keeps cancelled regardless of window', () => {
    expect(
      resolveExamAssignmentEffectiveStatus(
        ExamAssignmentStatus.Cancelled,
        opensAt,
        closesAt,
        new Date('2026-09-15T09:00:00.000Z'),
      ),
    ).toBe(ExamAssignmentStatus.Cancelled);
  });

  it('resolves initial status for future assignment', () => {
    expect(
      resolveInitialExamAssignmentStatus(
        new Date('2026-12-01T08:00:00.000Z'),
        new Date('2026-12-01T10:00:00.000Z'),
        new Date('2026-09-01T00:00:00.000Z'),
      ),
    ).toBe(ExamAssignmentStatus.Scheduled);
  });
});
