import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassCatechistAssignmentEntity } from '../entities/class-catechist-assignment.entity';
import type { CatechistAssignmentSnapshot } from '../interfaces/class-catechist-assignment.interface';

export function toCatechistAssignmentSnapshot(
  entity: ClassCatechistAssignmentEntity,
): CatechistAssignmentSnapshot {
  return {
    id: normalizeUuid(entity.id),
    classId: normalizeUuid(entity.classId),
    catechistUserId: normalizeUuid(entity.catechistUserId),
    assignmentRole: entity.assignmentRole,
    status: entity.status,
    assignedAt: entity.assignedAt,
    endedAt: entity.endedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
