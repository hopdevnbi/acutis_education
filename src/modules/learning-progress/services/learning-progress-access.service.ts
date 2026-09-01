import { Injectable } from '@nestjs/common';
import { StudentAccessService } from '../../student/services/student-access.service';
import { LearningProgressAccessDeniedError } from '../errors/learning-progress.errors';

@Injectable()
export class LearningProgressAccessService {
  constructor(private readonly studentAccessService: StudentAccessService) {}

  async assertCanManageEnrollmentLessonProgress(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<void> {
    if (await this.canManageEnrollmentLessonProgress(rawUserId, rawStudentId)) {
      return;
    }

    throw new LearningProgressAccessDeniedError();
  }

  async canManageEnrollmentLessonProgress(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<boolean> {
    return this.studentAccessService.canReadStudentByStudentEvidence(rawUserId, rawStudentId);
  }
}
