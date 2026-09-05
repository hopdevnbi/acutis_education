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
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { LearnerSelfScopeService } from '../../student/services/learner-self-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';

/**
 * Scope helpers for later HTTP prompts. Permission checks remain separate (permission != scope).
 */
@Injectable()
export class GamificationAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly learnerSelfScopeService: LearnerSelfScopeService,
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

  async assertCanReadLearnerSelf(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canReadAsLearnerSelf(rawUserId, rawStudentId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
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
}
