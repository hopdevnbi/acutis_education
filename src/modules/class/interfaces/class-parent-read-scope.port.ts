export interface ClassParentReadScopePort {
  canReadClassAsGuardian(rawUserId: string, rawClassId: string): Promise<boolean>;
}

export const CLASS_PARENT_READ_SCOPE_PORT = Symbol('CLASS_PARENT_READ_SCOPE_PORT');
