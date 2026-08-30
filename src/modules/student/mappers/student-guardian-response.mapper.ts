import { GuardianLinkListResponseDto } from '../dto/guardian-link-list-response.dto';
import { GuardianLinkResponseDto } from '../dto/guardian-link-response.dto';
import type {
  GuardianLinkSnapshot,
  ListGuardianLinksResult,
} from '../interfaces/student-guardian.interface';

export function toGuardianLinkResponseDto(snapshot: GuardianLinkSnapshot): GuardianLinkResponseDto {
  return {
    id: snapshot.id,
    studentId: snapshot.studentId,
    guardianUserId: snapshot.guardianUserId,
    relationshipType: snapshot.relationshipType,
    isPrimary: snapshot.isPrimary,
    status: snapshot.status,
    startsAt: snapshot.startsAt.toISOString(),
    endsAt: snapshot.endsAt === null ? null : snapshot.endsAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toGuardianLinkListResponseDto(
  result: ListGuardianLinksResult,
): GuardianLinkListResponseDto {
  return {
    items: result.items.map(toGuardianLinkResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
