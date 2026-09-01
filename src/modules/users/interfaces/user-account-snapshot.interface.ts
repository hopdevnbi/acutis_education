import type { UserStatus } from '../enums/user-status.enum';

export interface UserAccountSnapshot {
  readonly id: string;
  readonly email: string;
  readonly status: UserStatus;
  readonly preferredLocale: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AuthenticatedAccountSnapshot {
  readonly id: string;
  readonly email: string;
  readonly status: UserStatus;
}
