import { CatechistAssignmentListResponseDto } from '../dto/catechist-assignment-list-response.dto';
import { CatechistAssignmentResponseDto } from '../dto/catechist-assignment-response.dto';
import type {
  CatechistAssignmentSnapshot,
  ListCatechistAssignmentsResult,
} from '../interfaces/class-catechist-assignment.interface';

export function toCatechistAssignmentResponseDto(
  snapshot: CatechistAssignmentSnapshot,
): CatechistAssignmentResponseDto {
  return {
    id: snapshot.id,
    classId: snapshot.classId,
    catechistUserId: snapshot.catechistUserId,
    assignmentRole: snapshot.assignmentRole,
    status: snapshot.status,
    assignedAt: snapshot.assignedAt.toISOString(),
    endedAt: snapshot.endedAt === null ? null : snapshot.endedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toCatechistAssignmentListResponseDto(
  result: ListCatechistAssignmentsResult,
): CatechistAssignmentListResponseDto {
  return {
    items: result.items.map(toCatechistAssignmentResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
