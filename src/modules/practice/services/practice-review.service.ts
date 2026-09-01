import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';
import {
  PracticeIdempotencyConflictError,
  PracticeNoWrongQuestionsError,
  PracticeReviewSourceInvalidError,
  PracticeReviewSourceNotCompletedError,
} from '../errors/practice.errors';
import type {
  CreateReviewWrongSessionInput,
  ReviewWrongSessionResult,
} from '../interfaces/practice.interface';
import { computePracticeReviewWrongRequestHash } from '../utils/practice-generation-request-hash.util';
import {
  isQuestionFinallyIncorrect,
  type PracticeAttemptRecord,
} from '../utils/practice-attempt-state.util';
import { parseSelectedOptionIdsJson } from '../utils/practice-selected-options.util';
import { PracticeAccessService } from './practice-access.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

@Injectable()
export class PracticeReviewService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly practiceAccessService: PracticeAccessService,
    private readonly practiceSessionQueryService: PracticeSessionQueryService,
  ) {}

  async createReviewWrongSession(
    input: CreateReviewWrongSessionInput,
  ): Promise<ReviewWrongSessionResult> {
    const sourceSession = await this.practiceSessionQueryService.findSessionEntity(
      input.sourceSessionId,
    );
    const enrollment = await this.enrollmentService.getEnrollmentById(sourceSession.enrollmentId);

    await this.practiceAccessService.assertCanManageEnrollmentPractice(
      input.actorUserId,
      enrollment.studentId,
    );

    if (sourceSession.status === PracticeSessionStatus.Abandoned) {
      throw new PracticeReviewSourceInvalidError();
    }

    if (sourceSession.status !== PracticeSessionStatus.Completed) {
      throw new PracticeReviewSourceNotCompletedError();
    }

    const reviewRequestHash = computePracticeReviewWrongRequestHash(sourceSession.id);
    const existingSession =
      await this.practiceSessionQueryService.findExistingSessionByClientRequestId(
        sourceSession.enrollmentId,
        input.clientRequestId,
      );

    if (existingSession !== null) {
      if (
        existingSession.generationRequestHash !== null &&
        existingSession.generationRequestHash !== reviewRequestHash
      ) {
        throw new PracticeIdempotencyConflictError();
      }

      if (
        existingSession.sessionType !== PracticeSessionType.ReviewWrong ||
        existingSession.sourceSessionId === null ||
        normalizeUuid(existingSession.sourceSessionId) !== normalizeUuid(sourceSession.id)
      ) {
        throw new PracticeIdempotencyConflictError();
      }

      return {
        snapshot: await this.practiceSessionQueryService.getSessionSnapshot(existingSession.id),
        replayed: true,
      };
    }

    const wrongQuestions = await this.collectFinallyIncorrectQuestions(sourceSession);

    if (wrongQuestions.length === 0) {
      throw new PracticeNoWrongQuestionsError();
    }

    const childSessionId = generateUuidV4();
    const startedAt = new Date();

    try {
      await this.dataSource.transaction(async (entityManager) => {
        const sessionRepository = entityManager.getRepository(PracticeSessionEntity);
        const sessionQuestionRepository = entityManager.getRepository(
          PracticeSessionQuestionEntity,
        );

        const session = new PracticeSessionEntity();
        session.id = childSessionId;
        session.enrollmentId = sourceSession.enrollmentId;
        session.sessionType = PracticeSessionType.ReviewWrong;
        session.sourceSessionId = sourceSession.id;
        session.status = PracticeSessionStatus.InProgress;
        session.locale = sourceSession.locale;
        session.curriculumId = sourceSession.curriculumId;
        session.canonicalLessonKey = sourceSession.canonicalLessonKey;
        session.requestedQuestionCount = wrongQuestions.length;
        session.maxAttemptsPerQuestion = sourceSession.maxAttemptsPerQuestion;
        session.randomizeQuestions = false;
        session.randomizeOptions = false;
        session.clientRequestId = normalizeUuid(input.clientRequestId);
        session.generationRequestHash = reviewRequestHash;
        session.createdByUserId = normalizeUuid(input.actorUserId);
        session.startedAt = startedAt;
        session.completedAt = null;
        session.abandonedAt = null;

        await sessionRepository.save(session);

        for (const [index, wrongQuestion] of wrongQuestions.entries()) {
          const sessionQuestion = new PracticeSessionQuestionEntity();
          sessionQuestion.id = generateUuidV4();
          sessionQuestion.practiceSessionId = childSessionId;
          sessionQuestion.questionVersionId = wrongQuestion.questionVersionId;
          sessionQuestion.position = index + 1;
          sessionQuestion.deliveredOptionOrderJson = wrongQuestion.deliveredOptionOrderJson;
          sessionQuestion.translationRevisionId = wrongQuestion.translationRevisionId;
          sessionQuestion.deliveredLocale = wrongQuestion.deliveredLocale;
          await sessionQuestionRepository.save(sessionQuestion);
        }
      });
    } catch (error: unknown) {
      if (error instanceof QueryFailedError && isUniqueConstraintViolation(error.driverError)) {
        const replaySession =
          await this.practiceSessionQueryService.findExistingSessionByClientRequestId(
            sourceSession.enrollmentId,
            input.clientRequestId,
          );

        if (replaySession !== null) {
          if (
            replaySession.generationRequestHash !== null &&
            replaySession.generationRequestHash !== reviewRequestHash
          ) {
            throw new PracticeIdempotencyConflictError();
          }

          return {
            snapshot: await this.practiceSessionQueryService.getSessionSnapshot(replaySession.id),
            replayed: true,
          };
        }
      }

      throw error;
    }

    return {
      snapshot: await this.practiceSessionQueryService.getSessionSnapshot(childSessionId),
      replayed: false,
    };
  }

  private async collectFinallyIncorrectQuestions(sourceSession: PracticeSessionEntity): Promise<
    Array<{
      questionVersionId: string;
      deliveredOptionOrderJson: string | null;
      translationRevisionId: string | null;
      deliveredLocale: string | null;
    }>
  > {
    const sessionQuestions = await this.dataSource
      .getRepository(PracticeSessionQuestionEntity)
      .find({
        where: { practiceSessionId: sourceSession.id },
        order: { position: 'ASC' },
      });
    const attemptRepository = this.dataSource.getRepository(PracticeAnswerAttemptEntity);
    const wrongQuestions: Array<{
      questionVersionId: string;
      deliveredOptionOrderJson: string | null;
      translationRevisionId: string | null;
      deliveredLocale: string | null;
    }> = [];

    for (const sessionQuestion of sessionQuestions) {
      const attempts = await attemptRepository.find({
        where: { practiceSessionQuestionId: sessionQuestion.id },
        order: { attemptNumber: 'ASC' },
      });
      const attemptRecords: PracticeAttemptRecord[] = attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        clientAnswerId: attempt.clientAnswerId,
        selectedOptionIds: parseSelectedOptionIdsJson(attempt.selectedOptionIdsJson),
        isCorrect: attempt.isCorrect,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
      }));

      if (isQuestionFinallyIncorrect(attemptRecords, sourceSession.maxAttemptsPerQuestion)) {
        wrongQuestions.push({
          questionVersionId: sessionQuestion.questionVersionId,
          deliveredOptionOrderJson: sessionQuestion.deliveredOptionOrderJson,
          translationRevisionId: sessionQuestion.translationRevisionId,
          deliveredLocale: sessionQuestion.deliveredLocale,
        });
      }
    }

    return wrongQuestions;
  }
}
