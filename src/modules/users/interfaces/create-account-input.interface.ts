import type { UserStatus } from '../enums/user-status.enum';

export interface CreateAccountInput {
  readonly email: string;
  readonly password: string;
  readonly status?: UserStatus;
}
