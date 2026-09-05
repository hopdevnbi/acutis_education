import { Injectable } from '@nestjs/common';
import {
  CATECHIST_ROLE_CODE,
  PARENT_ROLE_CODE,
  PARISH_ADMIN_ROLE_CODE,
  STUDENT_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { LearnerSelfScopeService } from '../../student/services/learner-self-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import { RewardScopeType } from '../enums/gamification.enums';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';
import type { StudentGamificationContext } from '../interfaces/gamification.interfaces';

@Injectable()
export class GamificationAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly learnerSelfScopeService: LearnerSelfScopeService,
    private readonly studentService: StudentService,
  ) {}

  async isSuperAdmin(rawUserId: string): Promise<boolean> {
    return this.parishScopeService.isSuperAdmin(rawUserId);
  }

  async hasRole(rawUserId: string, roleCode: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(rawUserId);
    return roles.some((role) => role.code === roleCode);
  }

  async canReadAsLearnerSelf(rawUserId: string, rawStudentId: string): Promise<boolean> {
    const isStudent = await this.hasRole(rawUserId, STUDENT_ROLE_CODE);
    if (!isStudent) {
      return false;
    }
    try {
      await this.learnerSelfScopeService.assertActingAsLinkedStudent(rawUserId, rawStudentId);
      return true;
    } catch {
      return false;
    }
  }

  async canReadAsParentGuardian(rawUserId: string, rawStudentId: string): Promise<boolean> {
    const isParent = await this.hasRole(rawUserId, PARENT_ROLE_CODE);
    if (!isParent) {
      return false;
    }
    try {
      await this.studentGuardianService.assertGuardianLinked(rawUserId, rawStudentId);
      return true;
    } catch {
      return false;
    }
  }

  async canAccessAsCatechistAssignedClass(rawUserId: string, rawClassId: string): Promise<boolean> {
    const isCatechist = await this.hasRole(rawUserId, CATECHIST_ROLE_CODE);
    if (!isCatechist) {
      return false;
    }
    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(rawUserId, rawClassId);
      return true;
    } catch {
      return false;
    }
  }

  async canAccessAsParishAdmin(rawUserId: string, rawParishId: string): Promise<boolean> {
    const isParishAdmin = await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE);
    if (!isParishAdmin) {
      return false;
    }
    return this.parishScopeService.hasActiveParishMembership(rawUserId, rawParishId);
  }

  async canStaffAccessClass(rawUserId: string, rawClassId: string): Promise<boolean> {
    if (await this.isSuperAdmin(rawUserId)) {
      return true;
    }
    const classSnapshot = await this.classService.getClassById(rawClassId);
    if (await this.canAccessAsParishAdmin(rawUserId, classSnapshot.parishId)) {
      return true;
    }
    return this.canAccessAsCatechistAssignedClass(rawUserId, classSnapshot.id);
  }

  async canStaffAccessEnrollment(rawUserId: string, rawEnrollmentId: string): Promise<boolean> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);
    return this.canStaffAccessClass(rawUserId, enrollment.classId);
  }

  async resolveLinkedStudentIdForLearner(rawUserId: string): Promise<string> {
    const isStudent = await this.hasRole(rawUserId, STUDENT_ROLE_CODE);
    if (!isStudent) {
      throw new GamificationAccessDeniedError();
    }
    const studentIds = await this.studentService.listStudentIdsByLinkedUserId(rawUserId);
    if (studentIds.length !== 1) {
      throw new GamificationAccessDeniedError();
    }
    return studentIds[0]!;
  }

  async assertCanReadLearnerSelf(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canReadAsLearnerSelf(rawUserId, rawStudentId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  async assertLearnerCanReadOwnGamification(rawUserId: string): Promise<string> {
    const studentId = await this.resolveLinkedStudentIdForLearner(rawUserId);
    await this.assertCanReadLearnerSelf(rawUserId, studentId);
    return studentId;
  }

  async assertCanReadAsParent(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canReadAsParentGuardian(rawUserId, rawStudentId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  async assertCanStaffAccessClass(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.canStaffAccessClass(rawUserId, rawClassId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  async assertStaffCanReadStudentGamification(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    const activeEnrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([rawStudentId]);
    if (activeEnrollments.length === 0) {
      throw new GamificationAccessDeniedError();
    }

    for (const enrollment of activeEnrollments) {
      if (await this.canStaffAccessClass(rawUserId, enrollment.classId)) {
        return;
      }
    }

    throw new GamificationAccessDeniedError();
  }

  async assertStaffCanAdjustStudentPoints(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<void> {
    // Parent/Student never adjust via this path — role gate is permission + scope.
    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new GamificationAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE) && !(await this.isSuperAdmin(rawUserId))) {
      // Genuine student accounts cannot adjust even if somehow granted permission.
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new GamificationAccessDeniedError();
      }
    }
    await this.assertStaffCanReadStudentGamification(rawUserId, rawStudentId);
  }

  async assertStaffCanAdjustStudentInContext(
    rawUserId: string,
    context: StudentGamificationContext,
  ): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }
    if (await this.canAccessAsParishAdmin(rawUserId, context.parishId)) {
      return;
    }
    if (await this.canAccessAsCatechistAssignedClass(rawUserId, context.classId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  /**
   * Capability-specific manage: reward rules — SuperAdmin + ParishAdmin only.
   * Catechist is DENIED even with gamification.manage permission.
   */
  async assertCanManageRewardRules(
    rawUserId: string,
    input: { readonly scopeType: RewardScopeType; readonly parishId?: string | null },
  ): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) {
      throw new GamificationAccessDeniedError();
    }

    if (!(await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE))) {
      throw new GamificationAccessDeniedError();
    }

    if (input.scopeType !== RewardScopeType.Parish || !input.parishId) {
      throw new GamificationAccessDeniedError();
    }

    if (!(await this.canAccessAsParishAdmin(rawUserId, input.parishId))) {
      throw new GamificationAccessDeniedError();
    }
  }

  async assertCanReadRewardRules(rawUserId: string, parishId?: string | null): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }
    if (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) {
      throw new GamificationAccessDeniedError();
    }
    if (!(await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE))) {
      throw new GamificationAccessDeniedError();
    }
    if (!parishId) {
      throw new GamificationAccessDeniedError();
    }
    if (!(await this.canAccessAsParishAdmin(rawUserId, parishId))) {
      throw new GamificationAccessDeniedError();
    }
  }
}
