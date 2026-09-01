import { Injectable } from '@nestjs/common';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentAccessService } from '../../student/services/student-access.service';
import {
  PracticeAccessDeniedError,
  PracticeClassProgressAccessDeniedError,
} from '../errors/practice.errors';

@Injectable()
export class PracticeAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentAccessService: StudentAccessService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
  ) {}

  async assertCanManageEnrollmentPractice(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canManageEnrollmentPractice(rawUserId, rawStudentId)) {
      return;
    }

    throw new PracticeAccessDeniedError();
  }

  async assertCanReadLearnerSession(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.canReadLearnerSession(rawUserId, rawStudentId)) {
      return;
    }

    throw new PracticeAccessDeniedError();
  }

  async assertCanReadEnrollmentProgress(
    rawUserId: string,
    enrollment: EnrollmentSnapshot,
  ): Promise<void> {
    if (await this.canReadEnrollmentProgress(rawUserId, enrollment)) {
      return;
    }

    throw new PracticeAccessDeniedError();
  }

  async assertCanReadClassProgress(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.canReadClassProgress(rawUserId, rawClassId)) {
      return;
    }

    throw new PracticeClassProgressAccessDeniedError();
  }

  async canManageEnrollmentPractice(rawUserId: string, rawStudentId: string): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    return this.studentAccessService.canReadStudentByStudentEvidence(rawUserId, rawStudentId);
  }

  async canReadLearnerSession(rawUserId: string, rawStudentId: string): Promise<boolean> {
    return this.canManageEnrollmentPractice(rawUserId, rawStudentId);
  }

  async canReadEnrollmentProgress(
    rawUserId: string,
    enrollment: EnrollmentSnapshot,
  ): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    if (
      await this.studentAccessService.canReadStudentByStudentEvidence(
        rawUserId,
        enrollment.studentId,
      )
    ) {
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
