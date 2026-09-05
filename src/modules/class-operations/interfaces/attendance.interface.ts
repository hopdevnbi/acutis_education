import type { AttendanceStatus } from '../enums/attendance-status.enum';

export interface AttendanceRecordSnapshot {
  readonly id: string;
  readonly sessionId: string;
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly status: AttendanceStatus;
  readonly note: string | null;
  readonly markedAt: Date;
}

export interface UpsertAttendanceRecordInput {
  readonly enrollmentId: string;
  readonly studentId?: string;
  readonly status: AttendanceStatus | string;
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

export interface EnrollmentAttendanceHistoryItem {
  readonly sessionId: string;
  readonly classId: string;
  readonly title: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly sessionStatus: string;
  readonly attendanceStatus: AttendanceStatus | null;
  readonly note: string | null;
  readonly markedAt: Date | null;
}

export interface EnrollmentAttendanceHistoryResult {
  readonly enrollmentId: string;
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly items: EnrollmentAttendanceHistoryItem[];
}

export interface ListEnrollmentAttendanceHistoryInput {
  readonly enrollmentId: string;
  readonly page: number;
  readonly limit: number;
}
