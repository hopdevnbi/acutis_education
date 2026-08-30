import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CatechismLevelEntity } from '../entities/catechism-level.entity';
import type { CatechismLevelSnapshot } from '../interfaces/catechism-level.interface';

export function toCatechismLevelSnapshot(entity: CatechismLevelEntity): CatechismLevelSnapshot {
  return {
    id: normalizeUuid(entity.id),
    parishId: normalizeUuid(entity.parishId),
    code: entity.code,
    name: entity.name,
    sortOrder: entity.sortOrder,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
