import { normalizeUuid } from '../../../database/uuid-v4.util';
import type { ParishMembershipEntity } from '../entities/parish-membership.entity';
import type { ParishMembershipSnapshot } from '../interfaces/parish-membership.interface';

export function toParishMembershipSnapshot(
  entity: ParishMembershipEntity,
): ParishMembershipSnapshot {
  return {
    id: normalizeUuid(entity.id),
    parishId: normalizeUuid(entity.parishId),
    userId: normalizeUuid(entity.userId),
    status: entity.status,
    joinedAt: entity.joinedAt,
    endedAt: entity.endedAt,
  };
}
