import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptQuestionEntity } from '../entities/exam-attempt-question.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import {
  ExamAttemptNotFoundError,
  ExamAttemptQuestionNotFoundError,
  ExamReviewNotAvailableError,
  InvalidExamAttemptIdError,
} from '../errors/exam.errors';
import type {
  ExamAttemptResultReadSnapshot,
  ExamAttemptResultSnapshot,
} from '../interfaces/exam-attempt.interface';
import { buildExamAttemptResultSnapshot } from '../utils/exam-attempt-result.util';
import type { ExamReviewPolicy } from '../constants/exam-review-policy.constants';
import { parseExamSelectedOptionIdsJson } from '../utils/exam-selected-options.util';
import { ExamAttemptFinalizationService } from './exam-attempt-finalization.service';
import { ExamResultAccessService } from './exam-result-access.service';
import { ExamService } from './exam.service';

const STAFF_RESULT_REVIEW_POLICY = {
  scoreVisibility: 'AFTER_SUBMIT' as const,
  correctAnswerVisibility: 'AFTER_SUBMIT' as const,
  explanationVisibility: 'AFTER_SUBMIT' as const,
};

@Injectable()
export class ExamAttemptResultQueryService {
  constructor(
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(ExamAttemptQuestionEntity)
    private readonly examAttemptQuestionRepository: Repository<ExamAttemptQuestionEntity>,
    @InjectRepository(ExamAttemptAnswerEntity)
    private readonly examAttemptAnswerRepository: Repository<ExamAttemptAnswerEntity>,
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    private readonly examService: ExamService,
    private readonly questionBankService: QuestionBankService,
    private readonly examAttemptFinalizationService: ExamAttemptFinalizationService,
    private readonly examResultAccessService: ExamResultAccessService,
  ) {}

  async getAttemptResultRead(
    rawAttemptId: string,
    rawActorUserId: string,
  ): Promise<ExamAttemptResultReadSnapshot> {
    await this.examAttemptFinalizationService.finalizeIfExpired(rawAttemptId);

    const attempt = await this.findAttemptEntity(rawAttemptId);
    await this.examResultAccessService.assertCanReadAttemptResult(rawActorUserId, attempt);

    if (attempt.status === ExamAttemptStatus.InProgress) {
      throw new ExamReviewNotAvailableError();
    }

    const useStaffReviewPolicy = await this.examResultAccessService.shouldUseStaffReviewPolicy(
      rawActorUserId,
      attempt,
    );
    const result = await this.buildResultSnapshotForAttempt(attempt, useStaffReviewPolicy);

    return {
      id: attempt.id,
      examAssignmentId: attempt.examAssignmentId,
      enrollmentId: attempt.enrollmentId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      examId: attempt.examId,
      examVersionId: attempt.examVersionId,
      examTitleDelivered: attempt.examTitleDelivered,
      deliveredLocale: attempt.deliveredLocale,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
      questionCount: attempt.questionCount,
      result,
    };
  }

  async buildResultSnapshotForAttempt(
    attempt: ExamAttemptEntity,
    useStaffReviewPolicy = false,
  ): Promise<ExamAttemptResultSnapshot | null> {
    if (
      attempt.status !== ExamAttemptStatus.Submitted &&
      attempt.status !== ExamAttemptStatus.Graded
    ) {
      return null;
    }

    const assignment = await this.examAssignmentRepository.findOne({
      where: { id: attempt.examAssignmentId },
    });
    const assignmentClosed =
      assignment !== null && new Date().getTime() > assignment.closesAt.getTime();
    const version = await this.examService.getVersionById(attempt.examVersionId);
    const reviewPolicy = useStaffReviewPolicy ? STAFF_RESULT_REVIEW_POLICY : version.reviewPolicy;

    return this.buildPolicyGatedResultSnapshot(
      attempt,
      reviewPolicy,
      useStaffReviewPolicy ? true : assignmentClosed,
    );
  }

  private async buildPolicyGatedResultSnapshot(
    attempt: ExamAttemptEntity,
    reviewPolicy: ExamReviewPolicy,
    assignmentClosed: boolean,
  ): Promise<ExamAttemptResultSnapshot | null> {
    const attemptQuestions = await this.examAttemptQuestionRepository.find({
      where: { examAttemptId: attempt.id },
      order: { sortOrder: 'ASC' },
    });
    const questionVersionIds = attemptQuestions.map((question) => question.questionVersionId);
    const projections =
      await this.questionBankService.getLearnerQuestionProjections(questionVersionIds);
    const projectionMap = new Map(
      projections.map((projection) => [normalizeUuid(projection.questionVersionId), projection]),
    );
    const attemptQuestionIds = attemptQuestions.map((question) => question.id);
    const answers =
      attemptQuestionIds.length === 0
        ? []
        : await this.examAttemptAnswerRepository.find({
            where: { examAttemptQuestionId: In(attemptQuestionIds) },
          });
    const answersByQuestionId = new Map(
      answers.map((answer) => [normalizeUuid(answer.examAttemptQuestionId), answer]),
    );
    const gradeByQuestionVersionId = new Map<
      string,
      Awaited<ReturnType<QuestionBankService['gradeAnswer']>>
    >();
    const feedbackByQuestionVersionId = new Map<
      string,
      Awaited<ReturnType<QuestionBankService['getPracticeFeedback']>>
    >();

    for (const attemptQuestion of attemptQuestions) {
      const savedAnswer = answersByQuestionId.get(normalizeUuid(attemptQuestion.id));
      const selectedOptionIds =
        savedAnswer === undefined
          ? []
          : parseExamSelectedOptionIdsJson(savedAnswer.selectedOptionIdsJson);

      if (selectedOptionIds.length > 0) {
        const gradeResult = await this.questionBankService.gradeAnswer({
          questionVersionId: attemptQuestion.questionVersionId,
          selectedOptionIds,
        });
        gradeByQuestionVersionId.set(normalizeUuid(attemptQuestion.questionVersionId), gradeResult);
      }

      const feedback = await this.questionBankService.getPracticeFeedback(
        attemptQuestion.questionVersionId,
      );
      feedbackByQuestionVersionId.set(normalizeUuid(attemptQuestion.questionVersionId), feedback);
    }

    const reviewQuestions = attemptQuestions.map((attemptQuestion) => {
      const projection = projectionMap.get(normalizeUuid(attemptQuestion.questionVersionId));

      if (projection === undefined) {
        throw new ExamAttemptQuestionNotFoundError();
      }

      const savedAnswer = answersByQuestionId.get(normalizeUuid(attemptQuestion.id));

      return {
        examAttemptQuestionId: attemptQuestion.id,
        sortOrder: attemptQuestion.sortOrder,
        prompt: projection.prompt,
        questionType: projection.questionType,
        questionVersionId: attemptQuestion.questionVersionId,
        selectedOptionIds:
          savedAnswer === undefined
            ? []
            : parseExamSelectedOptionIdsJson(savedAnswer.selectedOptionIdsJson),
      };
    });

    return buildExamAttemptResultSnapshot({
      reviewPolicy,
      attemptStatus: attempt.status,
      assignmentClosed,
      correctCount: attempt.correctCount,
      scorePercent: attempt.scorePercent,
      passed: attempt.passed,
      autoSubmitReason: attempt.autoSubmitReason,
      questions: reviewQuestions,
      feedbackByQuestionVersionId,
      gradeByQuestionVersionId,
    });
  }

  private async findAttemptEntity(rawAttemptId: string): Promise<ExamAttemptEntity> {
    if (!isUuidV4(rawAttemptId)) {
      throw new InvalidExamAttemptIdError();
    }

    const attempt = await this.examAttemptRepository.findOne({
      where: { id: normalizeUuid(rawAttemptId) },
    });

    if (attempt === null) {
      throw new ExamAttemptNotFoundError();
    }

    return attempt;
  }
}
