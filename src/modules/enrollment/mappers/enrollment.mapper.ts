import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import type { EnrollmentSnapshot } from '../interfaces/enrollment.interface';

export function toEnrollmentSnapshot(entity: EnrollmentEntity): EnrollmentSnapshot {
  return {
    id: normalizeUuid(entity.id),
    studentId: normalizeUuid(entity.studentId),
    classId: normalizeUuid(entity.classId),
    parishId: normalizeUuid(entity.parishId),
    academicYearId: normalizeUuid(entity.academicYearId),
    status: entity.status,
    enrolledAt: entity.enrolledAt,
    leftAt: entity.leftAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
