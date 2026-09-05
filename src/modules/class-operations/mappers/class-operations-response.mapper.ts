import { AttendanceStatus } from '../enums/attendance-status.enum';
import type { ClassSessionWithCounts } from '../interfaces/class-session.interface';
import type { SessionAttendanceView } from '../interfaces/class-session.interface';
import type { ClassSessionResponseDto } from '../dto/class-session-response.dto';
import type { SessionAttendanceResponseDto } from '../dto/session-attendance-response.dto';

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
