import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ParishEntity } from '../entities/parish.entity';
import type { ParishSnapshot } from '../interfaces/parish-snapshot.interface';

export function toParishSnapshot(entity: ParishEntity): ParishSnapshot {
  return {
    id: normalizeUuid(entity.id),
    code: entity.code,
    name: entity.name,
    status: entity.status,
    defaultLocale: entity.defaultLocale,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
