import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import {
  LearningProgressAccessDeniedError,
  LearningProgressClassProgressAccessDeniedError,
} from '../errors/learning-progress.errors';

@Injectable()
export class LearningProgressAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
  ) {}

  async assertCanManageLessonProgress(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canManageLessonProgress(rawUserId, rawStudentId)) {
      return;
    }

    throw new LearningProgressAccessDeniedError();
  }

  /** @deprecated Use assertCanManageLessonProgress */
  async assertCanManageEnrollmentLessonProgress(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<void> {
    return this.assertCanManageLessonProgress(rawUserId, rawStudentId);
  }

  async assertCanReadEnrollmentProgress(
    rawUserId: string,
    enrollment: EnrollmentSnapshot,
  ): Promise<void> {
    if (await this.canReadEnrollmentProgress(rawUserId, enrollment)) {
      return;
    }

    throw new LearningProgressAccessDeniedError();
  }

  async assertCanReadClassProgress(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.canReadClassProgress(rawUserId, rawClassId)) {
      return;
    }

    throw new LearningProgressClassProgressAccessDeniedError();
  }

  async canManageLessonProgress(rawUserId: string, rawStudentId: string): Promise<boolean> {
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
      return false;
    }
  }

  /** @deprecated Use canManageLessonProgress */
  async canManageEnrollmentLessonProgress(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<boolean> {
    return this.canManageLessonProgress(rawUserId, rawStudentId);
  }

  async canReadEnrollmentProgress(
    rawUserId: string,
    enrollment: EnrollmentSnapshot,
  ): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    if (await this.canManageLessonProgress(rawUserId, enrollment.studentId)) {
      return true;
    }

    if (await this.parishScopeService.hasActiveParishMembership(rawUserId, enrollment.parishId)) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(
        rawUserId,
        enrollment.classId,
      );

      return true;
    } catch {
      return false;
    }
  }

  async canReadClassProgress(rawUserId: string, rawClassId: string): Promise<boolean> {
    const classSnapshot = await this.classService.getClassById(rawClassId);

    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    if (
      await this.parishScopeService.hasActiveParishMembership(rawUserId, classSnapshot.parishId)
    ) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(rawUserId, rawClassId);

      return true;
    } catch {
      return false;
    }
  }
}
