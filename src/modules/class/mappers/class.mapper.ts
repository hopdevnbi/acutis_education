import type { ClassEntity } from '../entities/class.entity';
import type { ClassSnapshot } from '../interfaces/class.interface';

export function toClassSnapshot(classEntity: ClassEntity): ClassSnapshot {
  return {
    id: classEntity.id,
    parishId: classEntity.parishId,
    academicYearId: classEntity.academicYearId,
    catechismLevelId: classEntity.catechismLevelId,
    code: classEntity.code,
    name: classEntity.name,
    status: classEntity.status,
    createdAt: classEntity.createdAt,
    updatedAt: classEntity.updatedAt,
  };
}
