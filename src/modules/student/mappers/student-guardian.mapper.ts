import { normalizeUuid } from '../../../database/uuid-v4.util';
import { StudentGuardianEntity } from '../entities/student-guardian.entity';
import type { GuardianLinkSnapshot } from '../interfaces/student-guardian.interface';

export function toGuardianLinkSnapshot(entity: StudentGuardianEntity): GuardianLinkSnapshot {
  return {
    id: normalizeUuid(entity.id),
    studentId: normalizeUuid(entity.studentId),
    guardianUserId: normalizeUuid(entity.guardianUserId),
    relationshipType: entity.relationshipType,
    isPrimary: entity.isPrimary,
    status: entity.status,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
