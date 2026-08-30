import { normalizeUuid } from '../../../database/uuid-v4.util';
import { PermissionEntity } from '../entities/permission.entity';
import type { PermissionSnapshot } from '../interfaces/permission-snapshot.interface';

export function toPermissionSnapshot(entity: PermissionEntity): PermissionSnapshot {
  return {
    id: normalizeUuid(entity.id),
    code: entity.code,
    name: entity.name,
    description: entity.description,
  };
}
