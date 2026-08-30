import { Injectable } from '@nestjs/common';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassScopeService } from '../../class/services/class-scope.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  StudentAccessDeniedError,
  StudentManageAccessDeniedError,
} from '../../student/errors/student-access.errors';
import type { StudentDomainScopePort } from '../../student/interfaces/student-domain-scope.port';
import { StudentAccessService } from '../../student/services/student-access.service';
import { StudentService } from '../../student/services/student.service';
import { EnrollmentQueryService } from './enrollment-query.service';

@Injectable()
export class EnrollmentAccessService implements StudentDomainScopePort {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentAccessService: StudentAccessService,
    private readonly studentService: StudentService,
    private readonly classScopeService: ClassScopeService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  async assertCanManageStudent(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canManageStudent(rawUserId, rawStudentId)) {
      return;
    }

    throw new StudentManageAccessDeniedError();
  }

  async assertCanReadStudent(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canReadStudent(rawUserId, rawStudentId)) {
      return;
    }

    throw new StudentAccessDeniedError();
  }

  async canManageStudent(rawUserId: string, rawStudentId: string): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    const parishIds = await this.parishScopeService.listActiveParishIdsForMember(rawUserId);

    if (parishIds.length === 0) {
      return false;
    }

    for (const parishId of parishIds) {
      if (
        await this.enrollmentQueryService.hasActiveEnrollmentInParishForStudent(
          rawStudentId,
          parishId,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  async canReadStudent(rawUserId: string, rawStudentId: string): Promise<boolean> {
    if (await this.canManageStudent(rawUserId, rawStudentId)) {
      return true;
    }

    if (await this.studentAccessService.canReadStudentByStudentEvidence(rawUserId, rawStudentId)) {
      return true;
    }

    const assignedClassIds =
      await this.classCatechistAssignmentService.listAssignedClassIds(rawUserId);

    return this.enrollmentQueryService.hasActiveEnrollmentInAssignedClassForStudent(
      rawStudentId,
      assignedClassIds,
    );
  }

  async resolveAccessibleStudentIds(rawUserId: string): Promise<string[] | null> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return null;
    }

    const accessibleStudentIds = new Set<string>();
    const parishIds = await this.parishScopeService.listActiveParishIdsForMember(rawUserId);
    const parishStudentIds =
      await this.enrollmentQueryService.listActiveStudentIdsInParishes(parishIds);

    for (const studentId of parishStudentIds) {
      accessibleStudentIds.add(studentId);
    }

    const guardianStudentIds =
      await this.enrollmentQueryService.listStudentIdsForGuardian(rawUserId);

    for (const studentId of guardianStudentIds) {
      accessibleStudentIds.add(studentId);
    }

    const assignedClassIds =
      await this.classCatechistAssignmentService.listAssignedClassIds(rawUserId);
    const catechistStudentIds =
      await this.enrollmentQueryService.listActiveStudentIdsInClasses(assignedClassIds);

    for (const studentId of catechistStudentIds) {
      accessibleStudentIds.add(studentId);
    }

    const selfLinkedStudentIds = await this.studentService.listStudentIdsByLinkedUserId(rawUserId);

    for (const studentId of selfLinkedStudentIds) {
      accessibleStudentIds.add(studentId);
    }

    return [...accessibleStudentIds];
  }

  async assertCanReadClass(rawUserId: string, rawClassId: string): Promise<void> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);
  }

  async assertCanReadEnrollment(
    rawUserId: string,
    rawClassId: string,
    rawStudentId: string,
  ): Promise<void> {
    if (await this.classScopeService.canReadClass(rawUserId, rawClassId)) {
      return;
    }

    if (await this.canReadStudent(rawUserId, rawStudentId)) {
      return;
    }

    await this.assertCanReadClass(rawUserId, rawClassId);
  }
}
