import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import type { AcademicYearSnapshot } from '../interfaces/academic-year.interface';

export function toAcademicYearSnapshot(entity: AcademicYearEntity): AcademicYearSnapshot {
  return {
    id: normalizeUuid(entity.id),
    parishId: normalizeUuid(entity.parishId),
    name: entity.name,
    startDate: entity.startDate,
    endDate: entity.endDate,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
