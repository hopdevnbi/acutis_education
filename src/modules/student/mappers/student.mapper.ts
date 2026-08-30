import { normalizeUuid } from '../../../database/uuid-v4.util';
import { StudentEntity } from '../entities/student.entity';
import type { StudentSnapshot } from '../interfaces/student.interface';

export function toStudentSnapshot(entity: StudentEntity): StudentSnapshot {
  return {
    id: normalizeUuid(entity.id),
    userId: entity.userId === null ? null : normalizeUuid(entity.userId),
    fullName: entity.fullName,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
