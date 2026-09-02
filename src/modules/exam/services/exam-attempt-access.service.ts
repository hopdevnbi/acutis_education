import { Injectable } from '@nestjs/common';
import { LearnerSelfScopeService } from '../../student/services/learner-self-scope.service';
import { ExamAccessDeniedError } from '../errors/exam.errors';

@Injectable()
export class ExamAttemptAccessService {
  constructor(private readonly learnerSelfScopeService: LearnerSelfScopeService) {}

  async assertCanAttemptAsLinkedStudent(rawUserId: string, rawStudentId: string): Promise<void> {
    try {
      await this.learnerSelfScopeService.assertActingAsLinkedStudent(rawUserId, rawStudentId);
    } catch {
      throw new ExamAccessDeniedError();
    }
  }
}
