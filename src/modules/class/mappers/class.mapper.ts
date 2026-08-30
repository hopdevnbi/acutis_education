import { normalizeUuid } from '../../../database/uuid-v4.util';
import type { ClassEntity } from '../entities/class.entity';
import type { ClassSnapshot } from '../interfaces/class.interface';

export function toClassSnapshot(classEntity: ClassEntity): ClassSnapshot {
  return {
    id: normalizeUuid(classEntity.id),
    parishId: normalizeUuid(classEntity.parishId),
    academicYearId: normalizeUuid(classEntity.academicYearId),
    catechismLevelId: normalizeUuid(classEntity.catechismLevelId),
    code: classEntity.code,
    name: classEntity.name,
    status: classEntity.status,
    createdAt: classEntity.createdAt,
    updatedAt: classEntity.updatedAt,
  };
}
