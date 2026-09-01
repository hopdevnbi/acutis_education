import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import type { GradeAnswerResult } from '../../question-bank/interfaces/question-bank.interface';
import {
  InvalidGradeAnswerInputError,
  InvalidQuestionOptionIdError,
} from '../../question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import {
  PracticeAnswerIdempotencyConflictError,
  PracticeInvalidAnswerError,
  PracticeQuestionFinalizedError,
  PracticeSessionAbandonedError,
  PracticeSessionCompletedError,
  PracticeSessionQuestionNotFoundError,
} from '../errors/practice.errors';
import type {
  PracticeAnswerResult,
  PracticeSessionQuestionFeedback,
  SubmitPracticeAnswerInput,
} from '../interfaces/practice.interface';
import {
  derivePracticeQuestionAttemptState,
  type PracticeAttemptRecord,
} from '../utils/practice-attempt-state.util';
import {
  parseSelectedOptionIdsJson,
  selectedOptionSetsEqual,
  serializeSelectedOptionIdsJson,
} from '../utils/practice-selected-options.util';
import { PracticeAccessService } from './practice-access.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

@Injectable()
export class PracticeAnswerService {
  private readonly logger = new Logger(PracticeAnswerService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly questionBankService: QuestionBankService,
    private readonly practiceAccessService: PracticeAccessService,
    private readonly practiceSessionQueryService: PracticeSessionQueryService,
  ) {}

  async submitAnswer(input: SubmitPracticeAnswerInput): Promise<PracticeAnswerResult> {
    const session = await this.practiceSessionQueryService.findSessionEntity(input.sessionId);
    const enrollment = await this.enrollmentService.getEnrollmentById(session.enrollmentId);

    await this.practiceAccessService.assertCanManageEnrollmentPractice(
      input.actorUserId,
      enrollment.studentId,
    );

    this.assertSessionAcceptsAnswers(session.status);

    const normalizedSelectedOptionIds = this.normalizeAnswerSelection(input.selectedOptionIds);
    const existingReplay = await this.findExistingAttemptByClientAnswerId(
      input.sessionQuestionId,
      input.clientAnswerId,
    );

    if (existingReplay !== null) {
      this.assertMatchingIdempotentSelection(existingReplay, normalizedSelectedOptionIds);

      return this.buildAnswerResultFromExistingAttempt(
        session,
        input.sessionQuestionId,
        existingReplay,
      );
    }

    return this.dataSource.transaction(async (entityManager) => {
      const sessionQuestionRepository = entityManager.getRepository(PracticeSessionQuestionEntity);
      const sessionRepository = entityManager.getRepository(PracticeSessionEntity);
      const attemptRepository = entityManager.getRepository(PracticeAnswerAttemptEntity);

      const lockedSessionQuestion = await sessionQuestionRepository.findOne({
        where: { id: normalizeUuid(input.sessionQuestionId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        lockedSessionQuestion === null ||
        normalizeUuid(lockedSessionQuestion.practiceSessionId) !== normalizeUuid(input.sessionId)
      ) {
        throw new PracticeSessionQuestionNotFoundError();
      }

      const lockedSession = await sessionRepository.findOne({
        where: { id: normalizeUuid(input.sessionId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (lockedSession === null) {
        throw new PracticeSessionQuestionNotFoundError();
      }

      this.assertSessionAcceptsAnswers(lockedSession.status);

      const replayAttempt = await attemptRepository.findOne({
        where: {
          practiceSessionQuestionId: lockedSessionQuestion.id,
          clientAnswerId: normalizeUuid(input.clientAnswerId),
        },
      });

      if (replayAttempt !== null) {
        this.assertMatchingIdempotentSelection(replayAttempt, normalizedSelectedOptionIds);

        return this.buildAnswerResultFromExistingAttempt(
          lockedSession,
          lockedSessionQuestion.id,
          replayAttempt,
        );
      }

      const attempts = await attemptRepository.find({
        where: { practiceSessionQuestionId: lockedSessionQuestion.id },
        order: { attemptNumber: 'ASC' },
      });
      const attemptState = derivePracticeQuestionAttemptState({
        attempts: attempts.map((attempt) => this.toAttemptRecord(attempt)),
        maxAttemptsPerQuestion: lockedSession.maxAttemptsPerQuestion,
        sessionStatus: lockedSession.status,
      });

      if (attemptState.finalized) {
        throw new PracticeQuestionFinalizedError();
      }

      const gradeResult = await this.gradePinnedAnswer(
        lockedSessionQuestion.questionVersionId,
        normalizedSelectedOptionIds,
      );

      const attempt = new PracticeAnswerAttemptEntity();
      attempt.id = generateUuidV4();
      attempt.practiceSessionQuestionId = lockedSessionQuestion.id;
      attempt.attemptNumber = attemptState.attemptCount + 1;
      attempt.clientAnswerId = normalizeUuid(input.clientAnswerId);
      attempt.selectedOptionIdsJson = serializeSelectedOptionIdsJson(normalizedSelectedOptionIds);
      attempt.isCorrect = gradeResult.isCorrect;
      attempt.score = gradeResult.score;
      attempt.submittedByUserId = normalizeUuid(input.actorUserId);
      attempt.submittedAt = new Date();

      try {
        await attemptRepository.save(attempt);
      } catch (error: unknown) {
        if (error instanceof QueryFailedError && isUniqueConstraintViolation(error.driverError)) {
          const racedAttempt = await attemptRepository.findOne({
            where: {
              practiceSessionQuestionId: lockedSessionQuestion.id,
              clientAnswerId: normalizeUuid(input.clientAnswerId),
            },
          });

          if (racedAttempt !== null) {
            this.assertMatchingIdempotentSelection(racedAttempt, normalizedSelectedOptionIds);

            return this.buildAnswerResultFromExistingAttempt(
              lockedSession,
              lockedSessionQuestion.id,
              racedAttempt,
            );
          }

          throw new PracticeQuestionFinalizedError();
        }

        throw error;
      }

      this.logger.log({
        action: 'practice.answer.submitted',
        sessionId: lockedSession.id,
        sessionQuestionId: lockedSessionQuestion.id,
        questionVersionId: lockedSessionQuestion.questionVersionId,
        attemptNumber: attempt.attemptNumber,
        actorUserId: input.actorUserId,
        isCorrect: attempt.isCorrect,
      });

      const updatedQuestionState = derivePracticeQuestionAttemptState({
        attempts: [
          ...attempts.map((row) => this.toAttemptRecord(row)),
          this.toAttemptRecord(attempt),
        ],
        maxAttemptsPerQuestion: lockedSession.maxAttemptsPerQuestion,
        sessionStatus: lockedSession.status,
      });

      const sessionCompleted = updatedQuestionState.finalized
        ? await this.tryAutoCompleteSession(entityManager, lockedSession)
        : lockedSession.status === PracticeSessionStatus.Completed;

      const feedback = await this.resolveFeedbackIfRevealed(
        lockedSessionQuestion.questionVersionId,
        updatedQuestionState.feedbackRevealed || sessionCompleted,
      );

      return {
        attemptId: attempt.id,
        clientAnswerId: attempt.clientAnswerId,
        attemptNumber: attempt.attemptNumber,
        isCorrect: attempt.isCorrect,
        score: attempt.score as 0 | 1,
        questionFinalized: updatedQuestionState.finalized,
        canRetry: updatedQuestionState.canRetry,
        remainingAttempts: updatedQuestionState.remainingAttempts,
        sessionCompleted,
        feedback,
        replayed: false,
      };
    });
  }

  private normalizeAnswerSelection(selectedOptionIds: readonly string[]): string[] {
    try {
      return parseSelectedOptionIdsJson(serializeSelectedOptionIdsJson(selectedOptionIds));
    } catch {
      throw new PracticeInvalidAnswerError();
    }
  }

  private assertMatchingIdempotentSelection(
    attempt: PracticeAnswerAttemptEntity,
    normalizedSelectedOptionIds: readonly string[],
  ): void {
    if (
      !selectedOptionSetsEqual(
        parseSelectedOptionIdsJson(attempt.selectedOptionIdsJson),
        normalizedSelectedOptionIds,
      )
    ) {
      throw new PracticeAnswerIdempotencyConflictError();
    }
  }

  private async gradePinnedAnswer(
    questionVersionId: string,
    normalizedSelectedOptionIds: readonly string[],
  ): Promise<GradeAnswerResult> {
    try {
      return await this.questionBankService.gradeAnswer({
        questionVersionId,
        selectedOptionIds: normalizedSelectedOptionIds,
      });
    } catch (error: unknown) {
      if (
        error instanceof InvalidGradeAnswerInputError ||
        error instanceof InvalidQuestionOptionIdError
      ) {
        throw new PracticeInvalidAnswerError();
      }

      throw error;
    }
  }

  private assertSessionAcceptsAnswers(status: PracticeSessionStatus): void {
    if (status === PracticeSessionStatus.Completed) {
      throw new PracticeSessionCompletedError();
    }

    if (status === PracticeSessionStatus.Abandoned) {
      throw new PracticeSessionAbandonedError();
    }
  }

  private async findExistingAttemptByClientAnswerId(
    rawSessionQuestionId: string,
    rawClientAnswerId: string,
  ): Promise<PracticeAnswerAttemptEntity | null> {
    return this.dataSource.getRepository(PracticeAnswerAttemptEntity).findOne({
      where: {
        practiceSessionQuestionId: normalizeUuid(rawSessionQuestionId),
        clientAnswerId: normalizeUuid(rawClientAnswerId),
      },
    });
  }

  private toAttemptRecord(attempt: PracticeAnswerAttemptEntity): PracticeAttemptRecord {
    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      clientAnswerId: attempt.clientAnswerId,
      selectedOptionIds: parseSelectedOptionIdsJson(attempt.selectedOptionIdsJson),
      isCorrect: attempt.isCorrect,
      score: attempt.score,
      submittedAt: attempt.submittedAt,
    };
  }

  private async buildAnswerResultFromExistingAttempt(
    session: PracticeSessionEntity,
    sessionQuestionId: string,
    attempt: PracticeAnswerAttemptEntity,
  ): Promise<PracticeAnswerResult> {
    const sessionQuestion = await this.practiceSessionQueryService.findSessionQuestionEntity(
      session.id,
      sessionQuestionId,
    );
    const attempts = await this.dataSource.getRepository(PracticeAnswerAttemptEntity).find({
      where: { practiceSessionQuestionId: normalizeUuid(sessionQuestionId) },
      order: { attemptNumber: 'ASC' },
    });
    const attemptState = derivePracticeQuestionAttemptState({
      attempts: attempts.map((row) => this.toAttemptRecord(row)),
      maxAttemptsPerQuestion: session.maxAttemptsPerQuestion,
      sessionStatus: session.status,
    });
    const feedback = await this.resolveFeedbackIfRevealed(
      sessionQuestion.questionVersionId,
      attemptState.feedbackRevealed,
    );

    return {
      attemptId: attempt.id,
      clientAnswerId: attempt.clientAnswerId,
      attemptNumber: attempt.attemptNumber,
      isCorrect: attempt.isCorrect,
      score: attempt.score as 0 | 1,
      questionFinalized: attemptState.finalized,
      canRetry: attemptState.canRetry,
      remainingAttempts: attemptState.remainingAttempts,
      sessionCompleted: session.status === PracticeSessionStatus.Completed,
      feedback,
      replayed: true,
    };
  }

  private async resolveFeedbackIfRevealed(
    questionVersionId: string,
    feedbackRevealed: boolean,
  ): Promise<PracticeSessionQuestionFeedback | null> {
    if (!feedbackRevealed) {
      return null;
    }

    const feedback = await this.questionBankService.getPracticeFeedback(questionVersionId);

    return {
      explanation: feedback.explanation,
      explanationMediaJson: feedback.explanationMediaJson,
      correctOptionIds: feedback.correctOptionIds,
    };
  }

  private async tryAutoCompleteSession(
    entityManager: EntityManager,
    session: PracticeSessionEntity,
  ): Promise<boolean> {
    if (session.status !== PracticeSessionStatus.InProgress) {
      return session.status === PracticeSessionStatus.Completed;
    }

    const sessionQuestionRepository = entityManager.getRepository(PracticeSessionQuestionEntity);
    const attemptRepository = entityManager.getRepository(PracticeAnswerAttemptEntity);
    const sessionRepository = entityManager.getRepository(PracticeSessionEntity);
    const sessionQuestions = await sessionQuestionRepository.find({
      where: { practiceSessionId: session.id },
    });

    for (const sessionQuestion of sessionQuestions) {
      const attempts = await attemptRepository.find({
        where: { practiceSessionQuestionId: sessionQuestion.id },
        order: { attemptNumber: 'ASC' },
      });
      const attemptState = derivePracticeQuestionAttemptState({
        attempts: attempts.map((row) => this.toAttemptRecord(row)),
        maxAttemptsPerQuestion: session.maxAttemptsPerQuestion,
        sessionStatus: session.status,
      });

      if (!attemptState.finalized) {
        return false;
      }
    }

    session.status = PracticeSessionStatus.Completed;
    session.completedAt = new Date();
    await sessionRepository.save(session);

    return true;
  }
}
