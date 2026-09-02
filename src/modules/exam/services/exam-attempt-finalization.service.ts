import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptQuestionEntity } from '../entities/exam-attempt-question.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamAutoSubmitReason } from '../enums/exam-auto-submit-reason.enum';
import { ExamAttemptNotFoundError } from '../errors/exam.errors';
import { ExamService } from './exam.service';
import { computeExamPassed, computeExamScorePercent } from '../utils/exam-score.util';
import { parseExamSelectedOptionIdsJson } from '../utils/exam-selected-options.util';

@Injectable()
export class ExamAttemptFinalizationService {
  private readonly logger = new Logger(ExamAttemptFinalizationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly questionBankService: QuestionBankService,
    private readonly examService: ExamService,
  ) {}

  async finalizeIfExpired(rawAttemptId: string): Promise<boolean> {
    return this.dataSource.transaction(async (entityManager) => {
      const attempt = await this.lockAttemptEntity(rawAttemptId, entityManager);

      if (attempt === null || attempt.status !== ExamAttemptStatus.InProgress) {
        return false;
      }

      const now = new Date();

      if (now.getTime() <= attempt.deadlineAt.getTime()) {
        return false;
      }

      const reason = await this.resolveAutoSubmitReason(attempt, now, entityManager);
      await this.finalizeAttemptInTransaction(attempt, reason, entityManager);

      this.logger.log({
        action: 'exam.attempt.auto_finalized',
        attemptId: attempt.id,
        reason,
      });

      return true;
    });
  }

  async submitAttempt(rawAttemptId: string): Promise<void> {
    await this.dataSource.transaction(async (entityManager) => {
      const attempt = await this.lockAttemptEntity(rawAttemptId, entityManager);

      if (attempt === null) {
        throw new ExamAttemptNotFoundError();
      }

      if (
        attempt.status === ExamAttemptStatus.Submitted ||
        attempt.status === ExamAttemptStatus.Graded
      ) {
        return;
      }

      if (attempt.status !== ExamAttemptStatus.InProgress) {
        return;
      }

      await this.finalizeAttemptInTransaction(
        attempt,
        ExamAutoSubmitReason.LearnerSubmit,
        entityManager,
      );

      this.logger.log({
        action: 'exam.attempt.submitted',
        attemptId: attempt.id,
        reason: ExamAutoSubmitReason.LearnerSubmit,
      });
    });
  }

  private async finalizeAttemptInTransaction(
    attempt: ExamAttemptEntity,
    reason: ExamAutoSubmitReason,
    entityManager: EntityManager,
  ): Promise<void> {
    const attemptRepository = entityManager.getRepository(ExamAttemptEntity);
    const attemptQuestionRepository = entityManager.getRepository(ExamAttemptQuestionEntity);
    const answerRepository = entityManager.getRepository(ExamAttemptAnswerEntity);

    const submittedAt = new Date();
    attempt.status = ExamAttemptStatus.Submitted;
    attempt.submittedAt = submittedAt;
    attempt.autoSubmitReason = reason;
    await attemptRepository.save(attempt);

    const attemptQuestions = await attemptQuestionRepository.find({
      where: { examAttemptId: attempt.id },
      order: { sortOrder: 'ASC' },
    });
    const attemptQuestionIds = attemptQuestions.map((question) => question.id);
    const answers =
      attemptQuestionIds.length === 0
        ? []
        : await answerRepository.find({
            where: { examAttemptQuestionId: In(attemptQuestionIds) },
          });
    const answersByQuestionId = new Map(
      answers.map((answer) => [normalizeUuid(answer.examAttemptQuestionId), answer]),
    );

    let correctCount = 0;

    for (const attemptQuestion of attemptQuestions) {
      const savedAnswer = answersByQuestionId.get(normalizeUuid(attemptQuestion.id));

      if (savedAnswer === undefined) {
        continue;
      }

      const selectedOptionIds = parseExamSelectedOptionIdsJson(savedAnswer.selectedOptionIdsJson);
      const gradeResult = await this.questionBankService.gradeAnswer({
        questionVersionId: attemptQuestion.questionVersionId,
        selectedOptionIds,
      });

      if (gradeResult.isCorrect) {
        correctCount += 1;
      }
    }

    const questionCount = attemptQuestions.length;
    const version = await this.examService.getVersionById(attempt.examVersionId);
    const scorePercent = computeExamScorePercent(correctCount, questionCount);
    const passed = computeExamPassed(scorePercent, version.passingScorePercent);

    attempt.status = ExamAttemptStatus.Graded;
    attempt.gradedAt = new Date();
    attempt.questionCount = questionCount;
    attempt.correctCount = correctCount;
    attempt.scorePercent = scorePercent;
    attempt.passed = passed;

    await attemptRepository.save(attempt);
  }

  private async resolveAutoSubmitReason(
    attempt: ExamAttemptEntity,
    now: Date,
    entityManager: EntityManager,
  ): Promise<ExamAutoSubmitReason> {
    const assignment = await entityManager.findOne(ExamAssignmentEntity, {
      where: { id: attempt.examAssignmentId },
    });

    if (assignment !== null && now.getTime() > assignment.closesAt.getTime()) {
      return ExamAutoSubmitReason.AssignmentClosed;
    }

    return ExamAutoSubmitReason.TimeExpired;
  }

  private async lockAttemptEntity(
    rawAttemptId: string,
    entityManager: EntityManager,
  ): Promise<ExamAttemptEntity | null> {
    return entityManager.getRepository(ExamAttemptEntity).findOne({
      where: { id: normalizeUuid(rawAttemptId) },
      lock: { mode: 'pessimistic_write' },
    });
  }
}
