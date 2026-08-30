export interface StudentDomainScopePort {
  assertCanReadStudent(rawUserId: string, rawStudentId: string): Promise<void>;
  assertCanManageStudent(rawUserId: string, rawStudentId: string): Promise<void>;
  resolveAccessibleStudentIds(rawUserId: string): Promise<string[] | null>;
}

export const STUDENT_DOMAIN_SCOPE_PORT = Symbol('STUDENT_DOMAIN_SCOPE_PORT');
