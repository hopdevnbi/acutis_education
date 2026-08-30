import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  StudentAccessDeniedError,
  StudentManageAccessDeniedError,
} from '../errors/student-access.errors';
import { StudentGuardianService } from './student-guardian.service';
import { StudentService } from './student.service';

@Injectable()
export class StudentAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    @Inject(forwardRef(() => ClassCatechistAssignmentService))
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    @Inject(forwardRef(() => EnrollmentQueryService))
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  async canReadParishAsGuardian(rawUserId: string, rawParishId: string): Promise<boolean> {
    return this.enrollmentQueryService.hasGuardianLinkedStudentInParish(rawUserId, rawParishId);
  }

  async assertCanCreateStudent(rawUserId: string): Promise<void> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.parishScopeService.hasAnyActiveParishMembership(rawUserId)) {
      return;
    }

    throw new StudentManageAccessDeniedError();
  }

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

    const studentSnapshot = await this.studentService.getStudentById(rawStudentId);

    if (
      studentSnapshot.userId !== null &&
      normalizeUuid(studentSnapshot.userId) === normalizeUuid(rawUserId)
    ) {
      return true;
    }

    try {
      await this.studentGuardianService.assertGuardianLinked(rawUserId, rawStudentId);

      return true;
    } catch {
      // Fall through to catechist roster check.
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
}
