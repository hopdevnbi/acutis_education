import { normalizeUuid } from '../../../database/uuid-v4.util';
import { RoleEntity } from '../entities/role.entity';
import type { RoleSnapshot } from '../interfaces/role-snapshot.interface';

export function toRoleSnapshot(entity: RoleEntity): RoleSnapshot {
  return {
    id: normalizeUuid(entity.id),
    code: entity.code,
    name: entity.name,
    description: entity.description,
  };
}
