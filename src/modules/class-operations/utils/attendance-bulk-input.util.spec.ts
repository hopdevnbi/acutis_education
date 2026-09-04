import { AttendanceStatus } from '../enums/attendance-status.enum';
import { DuplicateAttendanceEnrollmentInputError } from '../errors/class-operations.errors';
import {
  assertNoDuplicateEnrollmentIds,
  normalizeAttendanceNote,
  parseAttendanceStatus,
} from './attendance-bulk-input.util';
import {
  computeAttendanceRatePercent,
  toAttendanceEnrollmentSummary,
} from './attendance-summary.util';

describe('attendance-bulk-input.util', () => {
  it('rejects duplicate enrollment ids', () => {
    expect(() =>
      assertNoDuplicateEnrollmentIds([
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
      ]),
    ).toThrow(DuplicateAttendanceEnrollmentInputError);
  });

  it('parses only PRESENT ABSENT LATE EXCUSED', () => {
    expect(parseAttendanceStatus('PRESENT')).toBe(AttendanceStatus.Present);
    expect(parseAttendanceStatus('LATE')).toBe(AttendanceStatus.Late);
    expect(() => parseAttendanceStatus('UNMARKED')).toThrow();
  });

  it('normalizes notes with max length 500', () => {
    expect(normalizeAttendanceNote('  hi  ')).toBe('hi');
    expect(normalizeAttendanceNote('')).toBeNull();
    expect(() => normalizeAttendanceNote('x'.repeat(501))).toThrow();
  });
});

describe('attendance-summary.util', () => {
  it('computes rate as round(100 * (present + late) / totalSessions)', () => {
    expect(computeAttendanceRatePercent(1, 1, 4)).toBe(50);
    expect(computeAttendanceRatePercent(0, 0, 0)).toBe(0);
    expect(
      toAttendanceEnrollmentSummary({
        enrollmentId: '11111111-1111-4111-8111-111111111111',
        totalSessions: 4,
        presentCount: 1,
        lateCount: 1,
        absentCount: 1,
        excusedCount: 0,
        unmarkedCount: 1,
      }).attendanceRatePercent,
    ).toBe(50);
  });

  it('treats excused as not present and unmarked as lowering rate', () => {
    const summary = toAttendanceEnrollmentSummary({
      enrollmentId: '11111111-1111-4111-8111-111111111111',
      totalSessions: 2,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 1,
      unmarkedCount: 1,
    });

    expect(summary.attendanceRatePercent).toBe(0);
  });
});
