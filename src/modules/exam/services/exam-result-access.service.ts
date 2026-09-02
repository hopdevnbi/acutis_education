import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import type { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import type { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAccessDeniedError } from '../errors/exam.errors';

@Injectable()
export class ExamResultAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
  ) {}

  async assertCanReadAttemptResult(
    rawActorUserId: string,
    attempt: ExamAttemptEntity,
  ): Promise<void> {
    if (await this.canReadAttemptResult(rawActorUserId, attempt)) {
      return;
    }

    throw new ExamAccessDeniedError();
  }

  async assertCanReadAssignmentAttemptSummaries(
    rawActorUserId: string,
    assignment: ExamAssignmentEntity,
  ): Promise<void> {
    if (await this.canReadAssignmentAttemptSummaries(rawActorUserId, assignment)) {
      return;
    }

    throw new ExamAccessDeniedError();
  }

  async canReadAttemptResult(rawActorUserId: string, attempt: ExamAttemptEntity): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawActorUserId)) {
      return true;
    }

    const studentSnapshot = await this.studentService.getStudentById(attempt.studentId);

    if (
      studentSnapshot.userId !== null &&
      normalizeUuid(studentSnapshot.userId) === normalizeUuid(rawActorUserId)
    ) {
      return true;
    }

    try {
      await this.studentGuardianService.assertGuardianLinked(rawActorUserId, attempt.studentId);

      return true;
    } catch {
      // Parent access handled only when guardian link exists.
    }

    if (await this.parishScopeService.hasActiveParishMembership(rawActorUserId, attempt.parishId)) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(
        rawActorUserId,
        attempt.classId,
      );

      return true;
    } catch {
      return false;
    }
  }

  async canReadAssignmentAttemptSummaries(
    rawActorUserId: string,
    assignment: ExamAssignmentEntity,
  ): Promise<boolean> {
    const classSnapshot = await this.classService.getClassById(assignment.classId);

    if (await this.parishScopeService.isSuperAdmin(rawActorUserId)) {
      return true;
    }

    if (
      await this.parishScopeService.hasActiveParishMembership(
        rawActorUserId,
        classSnapshot.parishId,
      )
    ) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(
        rawActorUserId,
        assignment.classId,
      );

      return true;
    } catch {
      return false;
    }
  }

  async shouldUseStaffReviewPolicy(
    rawActorUserId: string,
    attempt: ExamAttemptEntity,
  ): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawActorUserId)) {
      return true;
    }

    if (await this.parishScopeService.hasActiveParishMembership(rawActorUserId, attempt.parishId)) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(
        rawActorUserId,
        attempt.classId,
      );

      return true;
    } catch {
      return false;
    }
  }
}
