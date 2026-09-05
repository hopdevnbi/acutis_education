import type { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import type { AttendanceRecordSnapshot } from '../interfaces/attendance.interface';

export function toAttendanceRecordSnapshot(
  entity: AttendanceRecordEntity,
): AttendanceRecordSnapshot {
  return {
    id: entity.id,
    sessionId: entity.sessionId,
    enrollmentId: entity.enrollmentId,
    studentId: entity.studentId,
    status: entity.status,
    note: entity.note,
    markedAt: entity.markedAt,
  };
}
