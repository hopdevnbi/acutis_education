import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamAssignmentNotFoundError, InvalidExamAssignmentIdError } from '../errors/exam.errors';
import type { ListExamAssignmentAttemptSummariesResult } from '../interfaces/exam-attempt.interface';
import { ExamResultAccessService } from './exam-result-access.service';

@Injectable()
export class ExamAssignmentAttemptSummaryService {
  constructor(
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    private readonly examResultAccessService: ExamResultAccessService,
  ) {}

  async listAttemptSummariesForAssignment(
    rawAssignmentId: string,
    rawActorUserId: string,
  ): Promise<ListExamAssignmentAttemptSummariesResult> {
    const assignment = await this.findAssignmentEntity(rawAssignmentId);
    await this.examResultAccessService.assertCanReadAssignmentAttemptSummaries(
      rawActorUserId,
      assignment,
    );

    const attempts = await this.examAttemptRepository.find({
      where: { examAssignmentId: assignment.id },
      order: { submittedAt: 'DESC', startedAt: 'DESC' },
    });

    return {
      examAssignmentId: assignment.id,
      items: attempts.map((attempt) => ({
        attemptId: attempt.id,
        enrollmentId: attempt.enrollmentId,
        studentId: attempt.studentId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        gradedAt: attempt.gradedAt,
        scorePercent: attempt.status === ExamAttemptStatus.Graded ? attempt.scorePercent : null,
        passed: attempt.status === ExamAttemptStatus.Graded ? attempt.passed : null,
      })),
    };
  }

  private async findAssignmentEntity(rawAssignmentId: string): Promise<ExamAssignmentEntity> {
    if (!isUuidV4(rawAssignmentId)) {
      throw new InvalidExamAssignmentIdError();
    }

    const assignment = await this.examAssignmentRepository.findOne({
      where: { id: normalizeUuid(rawAssignmentId) },
    });

    if (assignment === null) {
      throw new ExamAssignmentNotFoundError();
    }

    return assignment;
  }
}
