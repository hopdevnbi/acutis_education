import { AttendanceStatus } from '../enums/attendance-status.enum';
import type {
  AttendanceEnrollmentSummary,
  EnrollmentAttendanceHistoryItem,
  EnrollmentAttendanceHistoryResult,
} from '../interfaces/attendance.interface';
import type { ClassSessionWithCounts } from '../interfaces/class-session.interface';
import type { SessionAttendanceView } from '../interfaces/class-session.interface';
import type { AttendanceSummaryResponseDto } from '../dto/attendance-summary-response.dto';
import type { ClassSessionResponseDto } from '../dto/class-session-response.dto';
import type { LearnerAttendanceHistoryItemDto } from '../dto/learner-attendance-history-item.dto';
import type { LearnerAttendanceHistoryResponseDto } from '../dto/learner-attendance-history-response.dto';
import type { SessionAttendanceResponseDto } from '../dto/session-attendance-response.dto';
import type { StaffAttendanceHistoryItemDto } from '../dto/staff-attendance-history-item.dto';
import type { StaffEnrollmentAttendanceHistoryResponseDto } from '../dto/staff-enrollment-attendance-history-response.dto';

export function toClassSessionResponseDto(
  session: ClassSessionWithCounts,
): ClassSessionResponseDto {
  return {
    id: session.id,
    classId: session.classId,
    parishId: session.parishId,
    academicYearId: session.academicYearId,
    title: session.title,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    status: session.status,
    cancelledAt: session.cancelledAt,
    completedAt: session.completedAt,
    rosterCount: session.rosterCount,
    markedCount: session.markedCount,
    unmarkedCount: session.unmarkedCount,
  };
}

export function toSessionAttendanceResponseDto(
  view: SessionAttendanceView,
): SessionAttendanceResponseDto {
  return {
    session: toClassSessionResponseDto({
      ...view.session,
      rosterCount: view.rosterCount,
      markedCount: view.markedCount,
      unmarkedCount: view.unmarkedCount,
    }),
    rosterCount: view.rosterCount,
    markedCount: view.markedCount,
    unmarkedCount: view.unmarkedCount,
    items: view.items.map((item) => ({
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      displayName: item.displayName,
      status: (item.status as AttendanceStatus | null) ?? null,
      note: item.note,
      markedAt: item.markedAt,
    })),
  };
}

export function toStaffAttendanceHistoryItemDto(
  item: EnrollmentAttendanceHistoryItem,
): StaffAttendanceHistoryItemDto {
  return {
    sessionId: item.sessionId,
    classId: item.classId,
    title: item.title,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    sessionStatus: item.sessionStatus,
    attendanceStatus: item.attendanceStatus,
    note: item.note,
    markedAt: item.markedAt,
  };
}

export function toLearnerAttendanceHistoryItemDto(
  item: EnrollmentAttendanceHistoryItem,
): LearnerAttendanceHistoryItemDto {
  return {
    sessionId: item.sessionId,
    classId: item.classId,
    title: item.title,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    sessionStatus: item.sessionStatus,
    attendanceStatus: item.attendanceStatus,
    markedAt: item.markedAt,
  };
}

export function toStaffEnrollmentAttendanceHistoryResponseDto(
  result: EnrollmentAttendanceHistoryResult,
): StaffEnrollmentAttendanceHistoryResponseDto {
  return {
    enrollmentId: result.enrollmentId,
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
    items: result.items.map(toStaffAttendanceHistoryItemDto),
  };
}

export function toLearnerAttendanceHistoryResponseDto(
  result: EnrollmentAttendanceHistoryResult,
): LearnerAttendanceHistoryResponseDto {
  return {
    enrollmentId: result.enrollmentId,
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
    items: result.items.map(toLearnerAttendanceHistoryItemDto),
  };
}

export function toAttendanceSummaryResponseDto(
  summary: AttendanceEnrollmentSummary,
): AttendanceSummaryResponseDto {
  return {
    enrollmentId: summary.enrollmentId,
    totalSessions: summary.totalSessions,
    presentCount: summary.presentCount,
    lateCount: summary.lateCount,
    absentCount: summary.absentCount,
    excusedCount: summary.excusedCount,
    unmarkedCount: summary.unmarkedCount,
    attendanceRatePercent: summary.attendanceRatePercent,
  };
}
