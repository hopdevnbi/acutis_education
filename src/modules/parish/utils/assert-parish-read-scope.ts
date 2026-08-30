import { ParishScopeAccessDeniedError } from '../errors/parish-scope.errors';

export interface ParishReadScopeDelegates {
  isSuperAdmin(userId: string): Promise<boolean>;
  hasActiveParishMembership(userId: string, parishId: string): Promise<boolean>;
  canReadParishAsCatechist(userId: string, parishId: string): Promise<boolean>;
  canReadParishAsGuardian(userId: string, parishId: string): Promise<boolean>;
}

export async function assertParishReadScope(
  userId: string,
  parishId: string,
  delegates: ParishReadScopeDelegates,
): Promise<void> {
  if (await delegates.isSuperAdmin(userId)) {
    return;
  }

  if (await delegates.hasActiveParishMembership(userId, parishId)) {
    return;
  }

  if (await delegates.canReadParishAsCatechist(userId, parishId)) {
    return;
  }

  if (await delegates.canReadParishAsGuardian(userId, parishId)) {
    return;
  }

  throw new ParishScopeAccessDeniedError();
}
