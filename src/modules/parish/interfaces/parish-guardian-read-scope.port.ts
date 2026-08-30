export interface ParishGuardianReadScopePort {
  canReadParishAsGuardian(rawUserId: string, rawParishId: string): Promise<boolean>;
}

export const PARISH_GUARDIAN_READ_SCOPE_PORT = Symbol('PARISH_GUARDIAN_READ_SCOPE_PORT');
