export interface CreatedAuthSessionResult {
  readonly sessionId: string;
  readonly tokenFamilyId: string;
  readonly userId: string;
  readonly rawRefreshToken: string;
  readonly expiresAt: Date;
}

export interface RotatedAuthSessionResult {
  readonly sessionId: string;
  readonly tokenFamilyId: string;
  readonly userId: string;
  readonly rawRefreshToken: string;
  readonly expiresAt: Date;
}
