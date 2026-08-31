import { Injectable } from '@nestjs/common';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentAccessService } from '../../student/services/student-access.service';
import { PracticeAccessDeniedError } from '../errors/practice.errors';

@Injectable()
export class PracticeAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentAccessService: StudentAccessService,
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

  async canManageEnrollmentPractice(rawUserId: string, rawStudentId: string): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    return this.studentAccessService.canReadStudentByStudentEvidence(rawUserId, rawStudentId);
  }

  async canReadLearnerSession(rawUserId: string, rawStudentId: string): Promise<boolean> {
    return this.canManageEnrollmentPractice(rawUserId, rawStudentId);
  }
}
