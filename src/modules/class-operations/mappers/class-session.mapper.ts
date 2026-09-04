import type { ClassSessionEntity } from '../entities/class-session.entity';
import type { ClassSessionSnapshot } from '../interfaces/class-session.interface';

export function toClassSessionSnapshot(entity: ClassSessionEntity): ClassSessionSnapshot {
  return {
    id: entity.id,
    classId: entity.classId,
    parishId: entity.parishId,
    academicYearId: entity.academicYearId,
    title: entity.title,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    status: entity.status,
    cancelledAt: entity.cancelledAt,
    completedAt: entity.completedAt,
  };
}
