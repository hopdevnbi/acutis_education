import { Injectable } from '@nestjs/common';
import {
  CATECHIST_ROLE_CODE,
  PARENT_ROLE_CODE,
  PARISH_ADMIN_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { LearnerSelfScopeService } from '../../student/services/learner-self-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { ClassOperationsAccessDeniedError } from '../errors/class-operations.errors';
import { ClassSessionService } from './class-session.service';

/**
 * Staff and future Parent/Learner access helpers for Class Operations.
 * Staff endpoints require assigned Catechist, ParishAdmin parish scope, or SuperAdmin.
 * Parent/Student never pass staff asserts via role alone or parish membership alone.
 */
@Injectable()
export class ClassOperationsAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly learnerSelfScopeService: LearnerSelfScopeService,
    private readonly classSessionService: ClassSessionService,
  ) {}

  async isSuperAdmin(rawUserId: string): Promise<boolean> {
    return this.parishScopeService.isSuperAdmin(rawUserId);
  }

  async hasRole(rawUserId: string, roleCode: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(rawUserId);

    return roles.some((role) => role.code === roleCode);
  }

  async canManageClassOperationsAsCatechist(
    rawUserId: string,
    rawClassId: string,
  ): Promise<boolean> {
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

  async canManageClassOperationsAsParishAdmin(
    rawUserId: string,
    rawParishId: string,
  ): Promise<boolean> {
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

    if (await this.canManageClassOperationsAsParishAdmin(rawUserId, classSnapshot.parishId)) {
      return true;
    }

    return this.canManageClassOperationsAsCatechist(rawUserId, classSnapshot.id);
  }

  async canStaffAccessSession(rawUserId: string, rawSessionId: string): Promise<boolean> {
    const session = await this.classSessionService.getSessionById(rawSessionId);

    return this.canStaffAccessClass(rawUserId, session.classId);
  }

  async assertCanStaffManageClass(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.canStaffAccessClass(rawUserId, rawClassId)) {
      return;
    }

    throw new ClassOperationsAccessDeniedError();
  }

  async assertCanStaffReadClass(rawUserId: string, rawClassId: string): Promise<void> {
    await this.assertCanStaffManageClass(rawUserId, rawClassId);
  }

  async assertCanStaffManageSession(rawUserId: string, rawSessionId: string): Promise<void> {
    if (await this.canStaffAccessSession(rawUserId, rawSessionId)) {
      return;
    }

    throw new ClassOperationsAccessDeniedError();
  }

  async assertCanStaffReadSession(rawUserId: string, rawSessionId: string): Promise<void> {
    await this.assertCanStaffManageSession(rawUserId, rawSessionId);
  }

  async canManageSessionWrites(rawUserId: string, rawSessionId: string): Promise<boolean> {
    return this.canStaffAccessSession(rawUserId, rawSessionId);
  }

  async canReadEnrollmentAttendanceAsParent(
    rawUserId: string,
    rawEnrollmentId: string,
  ): Promise<boolean> {
    const isParent = await this.hasRole(rawUserId, PARENT_ROLE_CODE);

    if (!isParent) {
      return false;
    }

    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    try {
      await this.studentGuardianService.assertGuardianLinked(rawUserId, enrollment.studentId);

      return true;
    } catch {
      return false;
    }
  }

  async canReadEnrollmentAttendanceAsLearner(
    rawUserId: string,
    rawEnrollmentId: string,
  ): Promise<boolean> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    try {
      await this.learnerSelfScopeService.assertActingAsLinkedStudent(
        rawUserId,
        enrollment.studentId,
      );

      return true;
    } catch {
      return false;
    }
  }
}
