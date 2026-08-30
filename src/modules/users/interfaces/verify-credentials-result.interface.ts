import type { AuthenticatedAccountSnapshot } from './user-account-snapshot.interface';

export type VerifyCredentialsResult =
  | {
      readonly valid: true;
      readonly account: AuthenticatedAccountSnapshot;
    }
  | {
      readonly valid: false;
    };

export const INVALID_CREDENTIALS_RESULT: VerifyCredentialsResult = {
  valid: false,
};
