import { AttendanceStatus } from '../enums/attendance-status.enum';
import {
  computeAttendanceRatePercent,
  incrementStatusCount,
  toAttendanceEnrollmentSummary,
} from './attendance-summary.util';

describe('attendance-summary.util', () => {
  it('returns zero summary when totalSessions is 0', () => {
    const summary = toAttendanceEnrollmentSummary({
      enrollmentId: 'enr-1',
      totalSessions: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      unmarkedCount: 0,
    });

    expect(summary.attendanceRatePercent).toBe(0);
    expect(summary.totalSessions).toBe(0);
  });

  it('counts PRESENT toward the rate', () => {
    expect(computeAttendanceRatePercent(2, 0, 4)).toBe(50);
  });

  it('counts LATE as present for the rate', () => {
    expect(computeAttendanceRatePercent(1, 1, 4)).toBe(50);
  });

  it('does not count ABSENT or EXCUSED as present', () => {
    expect(computeAttendanceRatePercent(0, 0, 4)).toBe(0);
  });

  it('treats UNMARKED as lowering the rate via totalSessions denominator', () => {
    const summary = toAttendanceEnrollmentSummary({
      enrollmentId: 'enr-1',
      totalSessions: 4,
      presentCount: 1,
      lateCount: 0,
      absentCount: 1,
      excusedCount: 1,
      unmarkedCount: 1,
    });

    expect(summary.attendanceRatePercent).toBe(25);
  });

  it('rounds mixed rates', () => {
    expect(computeAttendanceRatePercent(1, 0, 3)).toBe(33);
    expect(computeAttendanceRatePercent(2, 0, 3)).toBe(67);
  });

  it('increments UNMARKED when status is null', () => {
    const counts = {
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      unmarkedCount: 0,
    };

    incrementStatusCount(null, counts);
    incrementStatusCount(AttendanceStatus.Present, counts);
    incrementStatusCount(AttendanceStatus.Late, counts);
    incrementStatusCount(AttendanceStatus.Absent, counts);
    incrementStatusCount(AttendanceStatus.Excused, counts);

    expect(counts).toEqual({
      presentCount: 1,
      lateCount: 1,
      absentCount: 1,
      excusedCount: 1,
      unmarkedCount: 1,
    });
  });
});
