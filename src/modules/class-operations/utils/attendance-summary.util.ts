import { AttendanceStatus } from '../enums/attendance-status.enum';
import type { AttendanceEnrollmentSummary } from '../interfaces/attendance.interface';

export interface AttendanceSummaryCountInput {
  readonly enrollmentId: string;
  readonly presentCount: number;
  readonly lateCount: number;
  readonly absentCount: number;
  readonly excusedCount: number;
  readonly unmarkedCount: number;
  readonly totalSessions: number;
}

export function computeAttendanceRatePercent(
  presentCount: number,
  lateCount: number,
  totalSessions: number,
): number {
  if (totalSessions <= 0) {
    return 0;
  }

  return Math.round((100 * (presentCount + lateCount)) / totalSessions);
}

export function toAttendanceEnrollmentSummary(
  input: AttendanceSummaryCountInput,
): AttendanceEnrollmentSummary {
  return {
    enrollmentId: input.enrollmentId,
    totalSessions: input.totalSessions,
    presentCount: input.presentCount,
    lateCount: input.lateCount,
    absentCount: input.absentCount,
    excusedCount: input.excusedCount,
    unmarkedCount: input.unmarkedCount,
    attendanceRatePercent: computeAttendanceRatePercent(
      input.presentCount,
      input.lateCount,
      input.totalSessions,
    ),
  };
}

export function incrementStatusCount(
  status: AttendanceStatus | null,
  counts: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    unmarkedCount: number;
  },
): void {
  if (status === null) {
    counts.unmarkedCount += 1;
    return;
  }

  switch (status) {
    case AttendanceStatus.Present:
      counts.presentCount += 1;
      break;
    case AttendanceStatus.Late:
      counts.lateCount += 1;
      break;
    case AttendanceStatus.Absent:
      counts.absentCount += 1;
      break;
    case AttendanceStatus.Excused:
      counts.excusedCount += 1;
      break;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unexpected attendance status: ${String(exhaustive)}`);
    }
  }
}
