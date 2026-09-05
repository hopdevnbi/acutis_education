import { Injectable } from '@nestjs/common';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentService } from '../../student/services/student.service';

@Injectable()
export class AnnouncementAudienceResolver {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly accessControlService: AccessControlService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly studentService: StudentService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  /**
   * Resolves the complete set of audience target keys for an authenticated user:
   * 1. 'GLOBAL' (all authenticated users receive this)
   * 2. 'PARISH:<parishId>' for all active parish memberships
   * 3. 'ROLE:<parishId>:<roleCode>' for all user roles across active parishes
   * 4. 'CLASS:<classId>' for:
   *    - active catechist class assignments
   *    - active student enrolled classes
   *    - active child enrolled classes for parents/guardians
   */
  async resolveAudienceKeys(userId: string): Promise<string[]> {
    const audienceKeySet = new Set<string>();

    // 1. GLOBAL target
    audienceKeySet.add('GLOBAL');

    // 2. Active parish memberships
    const parishIds = await this.parishScopeService.listActiveParishIdsForMember(userId);
    for (const pid of parishIds) {
      audienceKeySet.add(`PARISH:${pid.toLowerCase()}`);
    }

    // 3. User roles across active parishes
    const roles = await this.accessControlService.getRolesForUser(userId);
    for (const role of roles) {
      const normalizedRole = role.code.trim().toUpperCase();
      for (const pid of parishIds) {
        audienceKeySet.add(`ROLE:${pid.toLowerCase()}:${normalizedRole}`);
      }
    }

    // 4. Classes from Catechist assignments
    const assignedClassIds =
      await this.classCatechistAssignmentService.listAssignedClassIds(userId);
    for (const cid of assignedClassIds) {
      audienceKeySet.add(`CLASS:${cid.toLowerCase()}`);
    }

    // 5. Classes from Student user link
    const studentIds = await this.studentService.listStudentIdsByLinkedUserId(userId);
    if (studentIds.length > 0) {
      const studentEnrollments =
        await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds(studentIds);
      for (const enrollment of studentEnrollments) {
        if (enrollment.classId) {
          audienceKeySet.add(`CLASS:${enrollment.classId.toLowerCase()}`);
        }
      }
    }

    // 6. Classes from Parent guardian link
    const guardianStudentIds =
      await this.enrollmentQueryService.listStudentIdsForGuardian(userId);
    if (guardianStudentIds.length > 0) {
      const guardianEnrollments =
        await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds(guardianStudentIds);
      for (const enrollment of guardianEnrollments) {
        if (enrollment.classId) {
          audienceKeySet.add(`CLASS:${enrollment.classId.toLowerCase()}`);
        }
      }
    }

    return Array.from(audienceKeySet);
  }
}
