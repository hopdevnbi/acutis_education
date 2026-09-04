import type { AttendanceStatus } from '../enums/attendance-status.enum';

export interface AttendanceRecordSnapshot {
  readonly sessionId: string;
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly status: AttendanceStatus;
  readonly note: string | null;
  readonly markedAt: Date;
}

export interface UpsertAttendanceRecordInput {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly status: AttendanceStatus;
  readonly note?: string | null;
  readonly markedByUserId: string;
}

export interface BulkUpsertAttendanceInput {
  readonly sessionId: string;
  readonly records: readonly UpsertAttendanceRecordInput[];
  readonly markedByUserId: string;
}

export interface AttendanceEnrollmentSummary {
  readonly enrollmentId: string;
  readonly totalSessions: number;
  readonly presentCount: number;
  readonly lateCount: number;
  readonly absentCount: number;
  readonly excusedCount: number;
  readonly unmarkedCount: number;
  readonly attendanceRatePercent: number;
}
