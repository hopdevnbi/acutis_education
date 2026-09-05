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
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { LearnerSelfScopeService } from '../../student/services/learner-self-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import {
  BadgeScopeType,
  MissionScopeType,
  RewardScopeType,
} from '../enums/gamification.enums';
import {
  GamificationAccessDeniedError,
  MissionProgressAccessDeniedError,
  MissionScopeAccessDeniedError,
} from '../errors/gamification.errors';
import type {
  BadgeDefinitionSnapshot,
  MissionDefinitionSnapshot,
  StudentGamificationContext,
} from '../interfaces/gamification.interfaces';

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

  async assertParentCanReadStudentGamificationByEnrollment(
    rawUserId: string,
    rawEnrollmentId: string,
  ): Promise<{ studentId: string; enrollment: EnrollmentSnapshot }> {
    const isParent = await this.hasRole(rawUserId, PARENT_ROLE_CODE);
    if (!isParent) {
      throw new GamificationAccessDeniedError();
    }

    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    try {
      await this.studentGuardianService.assertGuardianLinked(rawUserId, enrollment.studentId);
    } catch {
      throw new GamificationAccessDeniedError();
    }

    return {
      studentId: enrollment.studentId,
      enrollment,
    };
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

    const isStaff =
      (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE)) ||
      (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE));
    if (!isStaff) {
      throw new GamificationAccessDeniedError();
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

  /**
   * Badge definition manage: SuperAdmin GLOBAL+PARISH any; ParishAdmin own PARISH only;
   * Catechist DENIED.
   */
  async assertCanManageBadgeDefinitions(
    rawUserId: string,
    input: { readonly scopeType: BadgeScopeType; readonly parishId?: string | null },
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
    if (input.scopeType !== BadgeScopeType.Parish || !input.parishId) {
      throw new GamificationAccessDeniedError();
    }
    if (!(await this.canAccessAsParishAdmin(rawUserId, input.parishId))) {
      throw new GamificationAccessDeniedError();
    }
  }

  async assertCanReadBadgeDefinitions(
    rawUserId: string,
    parishId?: string | null,
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
    if (!parishId) {
      throw new GamificationAccessDeniedError();
    }
    if (!(await this.canAccessAsParishAdmin(rawUserId, parishId))) {
      throw new GamificationAccessDeniedError();
    }
  }

  /** Milestone definition manage: SuperAdmin only. */
  async assertCanManageMilestoneDefinitions(rawUserId: string): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  /**
   * Manual badge award/revoke: SuperAdmin; ParishAdmin own parish; Catechist assigned class.
   * Parent/Student denied.
   */
  async assertStaffCanAwardBadge(
    rawUserId: string,
    input: {
      readonly studentId: string;
      readonly context: StudentGamificationContext;
      readonly definition: BadgeDefinitionSnapshot;
    },
  ): Promise<void> {
    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new GamificationAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE) && !(await this.isSuperAdmin(rawUserId))) {
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new GamificationAccessDeniedError();
      }
    }

    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }
    if (await this.canAccessAsParishAdmin(rawUserId, input.context.parishId)) {
      return;
    }
    if (await this.canAccessAsCatechistAssignedClass(rawUserId, input.context.classId)) {
      return;
    }
    throw new GamificationAccessDeniedError();
  }

  /**
   * Mission definition manage: SuperAdmin any scope; ParishAdmin PARISH/CLASS own parish;
   * Catechist CLASS only when assigned; Parent/Student denied.
   */
  async assertCanManageMissionDefinition(
    rawUserId: string,
    input: {
      scopeType: MissionScopeType;
      parishId?: string | null;
      classId?: string | null;
    },
  ): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new MissionScopeAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE)) {
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new MissionScopeAccessDeniedError();
      }
    }

    if (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE)) {
      if (input.scopeType === MissionScopeType.Global) {
        throw new MissionScopeAccessDeniedError();
      }

      if (input.scopeType === MissionScopeType.Parish) {
        if (!input.parishId) {
          throw new MissionScopeAccessDeniedError();
        }
        if (!(await this.canAccessAsParishAdmin(rawUserId, input.parishId))) {
          throw new MissionScopeAccessDeniedError();
        }
        return;
      }

      if (input.scopeType === MissionScopeType.Class) {
        if (!input.classId) {
          throw new MissionScopeAccessDeniedError();
        }
        const classSnapshot = await this.classService.getClassById(input.classId);
        if (!(await this.canAccessAsParishAdmin(rawUserId, classSnapshot.parishId))) {
          throw new MissionScopeAccessDeniedError();
        }
        return;
      }

      throw new MissionScopeAccessDeniedError();
    }

    if (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) {
      if (input.scopeType !== MissionScopeType.Class || !input.classId) {
        throw new MissionScopeAccessDeniedError();
      }
      try {
        await this.classCatechistAssignmentService.assertCatechistAssigned(
          rawUserId,
          input.classId,
        );
        return;
      } catch {
        throw new MissionScopeAccessDeniedError();
      }
    }

    throw new MissionScopeAccessDeniedError();
  }

  async assertCanReadMissionDefinition(
    rawUserId: string,
    mission: Pick<MissionDefinitionSnapshot, 'scopeType' | 'parishId' | 'classId'>,
  ): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new MissionScopeAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE)) {
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new MissionScopeAccessDeniedError();
      }
    }

    if (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE)) {
      if (mission.scopeType === MissionScopeType.Global) {
        throw new MissionScopeAccessDeniedError();
      }

      if (mission.scopeType === MissionScopeType.Parish) {
        if (!mission.parishId) {
          throw new MissionScopeAccessDeniedError();
        }
        if (!(await this.canAccessAsParishAdmin(rawUserId, mission.parishId))) {
          throw new MissionScopeAccessDeniedError();
        }
        return;
      }

      if (mission.scopeType === MissionScopeType.Class) {
        if (!mission.classId) {
          throw new MissionScopeAccessDeniedError();
        }
        const classSnapshot = await this.classService.getClassById(mission.classId);
        if (!(await this.canAccessAsParishAdmin(rawUserId, classSnapshot.parishId))) {
          throw new MissionScopeAccessDeniedError();
        }
        return;
      }

      throw new MissionScopeAccessDeniedError();
    }

    if (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) {
      if (mission.scopeType !== MissionScopeType.Class || !mission.classId) {
        throw new MissionScopeAccessDeniedError();
      }
      try {
        await this.classCatechistAssignmentService.assertCatechistAssigned(
          rawUserId,
          mission.classId,
        );
        return;
      } catch {
        throw new MissionScopeAccessDeniedError();
      }
    }

    throw new MissionScopeAccessDeniedError();
  }

  async assertCanReadClassMissions(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new MissionScopeAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE)) {
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new MissionScopeAccessDeniedError();
      }
    }

    const classSnapshot = await this.classService.getClassById(rawClassId);

    if (await this.canAccessAsParishAdmin(rawUserId, classSnapshot.parishId)) {
      return;
    }

    if (await this.canAccessAsCatechistAssignedClass(rawUserId, classSnapshot.id)) {
      return;
    }

    throw new MissionScopeAccessDeniedError();
  }

  /**
   * Catechist on GLOBAL/PARISH must supply classId of assigned class.
   * Returns optional studentId filter for progress listing (null = no filter for SuperAdmin/ParishAdmin).
   */
  async assertCanReadMissionProgress(
    rawUserId: string,
    mission: Pick<MissionDefinitionSnapshot, 'scopeType' | 'parishId' | 'classId'>,
    options?: { classId?: string | null },
  ): Promise<{ studentIdsFilter: string[] | null }> {
    if (await this.hasRole(rawUserId, PARENT_ROLE_CODE)) {
      throw new MissionProgressAccessDeniedError();
    }
    if (await this.hasRole(rawUserId, STUDENT_ROLE_CODE)) {
      const isStaff =
        (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) ||
        (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE));
      if (!isStaff) {
        throw new MissionProgressAccessDeniedError();
      }
    }

    if (await this.isSuperAdmin(rawUserId)) {
      return { studentIdsFilter: null };
    }

    if (await this.hasRole(rawUserId, PARISH_ADMIN_ROLE_CODE)) {
      if (mission.scopeType === MissionScopeType.Global) {
        throw new MissionProgressAccessDeniedError();
      }

      if (mission.scopeType === MissionScopeType.Parish) {
        if (!mission.parishId) {
          throw new MissionProgressAccessDeniedError();
        }
        if (!(await this.canAccessAsParishAdmin(rawUserId, mission.parishId))) {
          throw new MissionProgressAccessDeniedError();
        }
        return { studentIdsFilter: null };
      }

      if (mission.scopeType === MissionScopeType.Class) {
        if (!mission.classId) {
          throw new MissionProgressAccessDeniedError();
        }
        const classSnapshot = await this.classService.getClassById(mission.classId);
        if (!(await this.canAccessAsParishAdmin(rawUserId, classSnapshot.parishId))) {
          throw new MissionProgressAccessDeniedError();
        }
        return { studentIdsFilter: null };
      }

      throw new MissionProgressAccessDeniedError();
    }

    if (await this.hasRole(rawUserId, CATECHIST_ROLE_CODE)) {
      let classIdForFilter: string | null = null;

      if (mission.scopeType === MissionScopeType.Class) {
        if (!mission.classId) {
          throw new MissionProgressAccessDeniedError();
        }
        classIdForFilter = mission.classId;
      } else if (
        mission.scopeType === MissionScopeType.Global ||
        mission.scopeType === MissionScopeType.Parish
      ) {
        if (!options?.classId) {
          throw new MissionProgressAccessDeniedError();
        }
        classIdForFilter = options.classId;

        if (mission.scopeType === MissionScopeType.Parish) {
          if (!mission.parishId) {
            throw new MissionProgressAccessDeniedError();
          }
          const classSnapshot = await this.classService.getClassById(classIdForFilter);
          if (classSnapshot.parishId !== mission.parishId) {
            throw new MissionProgressAccessDeniedError();
          }
        }
      } else {
        throw new MissionProgressAccessDeniedError();
      }

      try {
        await this.classCatechistAssignmentService.assertCatechistAssigned(
          rawUserId,
          classIdForFilter,
        );
      } catch {
        throw new MissionProgressAccessDeniedError();
      }

      const studentIds = await this.listActiveStudentIdsForClass(classIdForFilter);
      return { studentIdsFilter: studentIds };
    }

    throw new MissionProgressAccessDeniedError();
  }

  async listAssignedClassIdsForCatechist(rawUserId: string): Promise<string[]> {
    return this.classCatechistAssignmentService.listAssignedClassIds(rawUserId);
  }

  async resolveLearnerEnrollmentContext(
    rawStudentId: string,
  ): Promise<{ parishId: string; classIds: string[] }> {
    const enrollments = await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([
      rawStudentId,
    ]);
    if (enrollments.length === 0) {
      throw new GamificationAccessDeniedError();
    }

    const parishId = enrollments[0]!.parishId;
    const classIds = [...new Set(enrollments.map((enrollment) => enrollment.classId))];
    return { parishId, classIds };
  }

  private async listActiveStudentIdsForClass(rawClassId: string): Promise<string[]> {
    const result = await this.enrollmentService.listEnrollmentsByClass(rawClassId, {
      page: 1,
      limit: 1000,
      sortBy: 'enrolledAt',
      sort: 'DESC',
      status: EnrollmentStatus.Active,
    });

    return result.items
      .filter((enrollment) => enrollment.status === EnrollmentStatus.Active)
      .map((enrollment) => enrollment.studentId);
  }
}
