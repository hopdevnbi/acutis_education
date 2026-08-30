import type { GuardianLinkStatus } from '../enums/guardian-link-status.enum';
import type { GuardianRelationshipType } from '../enums/guardian-relationship-type.enum';

export interface GuardianLinkSnapshot {
  readonly id: string;
  readonly studentId: string;
  readonly guardianUserId: string;
  readonly relationshipType: GuardianRelationshipType;
  readonly isPrimary: boolean;
  readonly status: GuardianLinkStatus;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LinkGuardianInput {
  readonly guardianUserId: string;
  readonly relationshipType: GuardianRelationshipType;
  readonly isPrimary: boolean;
}

export interface ListGuardianLinksInput {
  readonly page: number;
  readonly limit: number;
  readonly includeEnded: boolean;
}

export interface ListGuardianLinksResult {
  readonly items: GuardianLinkSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
