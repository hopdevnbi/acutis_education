import type { ParishMembershipStatus } from '../enums/parish-membership-status.enum';

export interface ParishMembershipSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly userId: string;
  readonly status: ParishMembershipStatus;
  readonly joinedAt: Date;
  readonly endedAt: Date | null;
}
