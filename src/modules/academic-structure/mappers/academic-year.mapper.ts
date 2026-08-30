import { normalizeUuid } from '../../../database/uuid-v4.util';
import { normalizeIsoDateOnly } from '../../../database/iso-date-only-column.transformer';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import type { AcademicYearSnapshot } from '../interfaces/academic-year.interface';

export function toAcademicYearSnapshot(entity: AcademicYearEntity): AcademicYearSnapshot {
  return {
    id: normalizeUuid(entity.id),
    parishId: normalizeUuid(entity.parishId),
    name: entity.name,
    startDate: normalizeIsoDateOnly(entity.startDate),
    endDate: normalizeIsoDateOnly(entity.endDate),
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
