import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import type { LearnerQuestionProjection } from '../../question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { ExamAttemptAnswerEntity } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptQuestionEntity } from '../entities/exam-attempt-question.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import {
  ExamAnswerIdempotencyConflictError,
  ExamAnswerInvalidError,
  ExamAttemptNotFoundError,
  ExamAttemptNotInProgressError,
  ExamAttemptQuestionNotFoundError,
  InvalidExamAttemptIdError,
  InvalidExamAttemptQuestionIdError,
} from '../errors/exam.errors';
import type {
  ExamAttemptDeliverySnapshot,
  SaveExamAnswerInput,
} from '../interfaces/exam-attempt.interface';
import {
  examSelectedOptionSetsEqual,
  normalizeExamSelectedOptionIds,
  parseExamSelectedOptionIdsJson,
  serializeExamSelectedOptionIdsJson,
} from '../utils/exam-selected-options.util';
import { ExamAttemptAccessService } from './exam-attempt-access.service';
import { ExamAttemptFinalizationService } from './exam-attempt-finalization.service';
import { ExamAttemptQueryService } from './exam-attempt-query.service';

@Injectable()
export class ExamAttemptAnswerService {
  private readonly logger = new Logger(ExamAttemptAnswerService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly questionBankService: QuestionBankService,
    private readonly examAttemptAccessService: ExamAttemptAccessService,
    private readonly examAttemptFinalizationService: ExamAttemptFinalizationService,
    private readonly examAttemptQueryService: ExamAttemptQueryService,
  ) {}

  async saveAnswer(input: SaveExamAnswerInput): Promise<ExamAttemptDeliverySnapshot> {
    if (!isUuidV4(input.examAttemptId)) {
      throw new InvalidExamAttemptIdError();
    }

    if (!isUuidV4(input.examAttemptQuestionId)) {
      throw new InvalidExamAttemptQuestionIdError();
    }

    if (!isUuidV4(input.clientAnswerId)) {
      throw new ExamAnswerInvalidError();
    }

    const attempt = await this.findAttemptEntity(input.examAttemptId);
    await this.examAttemptAccessService.assertCanAttemptAsLinkedStudent(
      input.actorUserId,
      attempt.studentId,
    );

    const normalizedSelectedOptionIds = this.normalizeSelection(input.selectedOptionIds);
    const existingReplay = await this.findExistingAnswerByClientAnswerId(
      input.examAttemptQuestionId,
      input.clientAnswerId,
    );

    if (existingReplay !== null) {
      this.assertMatchingIdempotentSelection(existingReplay, normalizedSelectedOptionIds);

      await this.examAttemptFinalizationService.finalizeIfExpired(input.examAttemptId);

      return this.examAttemptQueryService.getAttemptDelivery(
        input.examAttemptId,
        input.actorUserId,
      );
    }

    await this.examAttemptFinalizationService.finalizeIfExpired(input.examAttemptId);

    const refreshedAttempt = await this.findAttemptEntity(input.examAttemptId);

    if (refreshedAttempt.status !== ExamAttemptStatus.InProgress) {
      throw new ExamAttemptNotInProgressError();
    }

    const now = new Date();

    if (now.getTime() > refreshedAttempt.deadlineAt.getTime()) {
      await this.examAttemptFinalizationService.finalizeIfExpired(input.examAttemptId);

      return this.examAttemptQueryService.getAttemptDelivery(
        input.examAttemptId,
        input.actorUserId,
      );
    }

    await this.dataSource.transaction(async (entityManager) => {
      const attemptQuestionRepository = entityManager.getRepository(ExamAttemptQuestionEntity);
      const attemptRepository = entityManager.getRepository(ExamAttemptEntity);
      const answerRepository = entityManager.getRepository(ExamAttemptAnswerEntity);

      const lockedQuestion = await attemptQuestionRepository.findOne({
        where: { id: normalizeUuid(input.examAttemptQuestionId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        lockedQuestion === null ||
        normalizeUuid(lockedQuestion.examAttemptId) !== normalizeUuid(input.examAttemptId)
      ) {
        throw new ExamAttemptQuestionNotFoundError();
      }

      const lockedAttempt = await attemptRepository.findOne({
        where: { id: normalizeUuid(input.examAttemptId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (lockedAttempt === null || lockedAttempt.status !== ExamAttemptStatus.InProgress) {
        throw new ExamAttemptNotInProgressError();
      }

      const replayAnswer = await answerRepository.findOne({
        where: {
          examAttemptQuestionId: lockedQuestion.id,
          clientAnswerId: normalizeUuid(input.clientAnswerId),
        },
      });

      if (replayAnswer !== null) {
        this.assertMatchingIdempotentSelection(replayAnswer, normalizedSelectedOptionIds);

        return;
      }

      const projection = await this.questionBankService.getLearnerQuestionProjection(
        lockedQuestion.questionVersionId,
      );
      this.assertSelectionMatchesDeliveredOptions(
        lockedQuestion,
        projection,
        normalizedSelectedOptionIds,
      );

      const existingAnswer = await answerRepository.findOne({
        where: { examAttemptQuestionId: lockedQuestion.id },
      });
      const savedAt = new Date();
      const payload = {
        selectedOptionIdsJson: serializeExamSelectedOptionIdsJson(normalizedSelectedOptionIds),
        savedAt,
        savedByUserId: normalizeUuid(input.actorUserId),
        clientAnswerId: normalizeUuid(input.clientAnswerId),
      };

      if (existingAnswer !== null) {
        Object.assign(existingAnswer, payload);
        await answerRepository.save(existingAnswer);
      } else {
        try {
          await answerRepository.save(
            answerRepository.create({
              examAttemptQuestionId: lockedQuestion.id,
              ...payload,
            }),
          );
        } catch (error: unknown) {
          if (error instanceof QueryFailedError && isUniqueConstraintViolation(error)) {
            const racedAnswer = await answerRepository.findOne({
              where: {
                examAttemptQuestionId: lockedQuestion.id,
                clientAnswerId: normalizeUuid(input.clientAnswerId),
              },
            });

            if (racedAnswer !== null) {
              this.assertMatchingIdempotentSelection(racedAnswer, normalizedSelectedOptionIds);

              return;
            }

            throw new ExamAnswerIdempotencyConflictError();
          }

          throw error;
        }
      }

      this.logger.log({
        action: 'exam.answer.saved',
        attemptId: lockedAttempt.id,
        examAttemptQuestionId: lockedQuestion.id,
        actorUserId: input.actorUserId,
      });
    });

    return this.examAttemptQueryService.getAttemptDelivery(input.examAttemptId, input.actorUserId);
  }

  private normalizeSelection(selectedOptionIds: readonly string[]): string[] {
    try {
      return normalizeExamSelectedOptionIds(selectedOptionIds);
    } catch {
      throw new ExamAnswerInvalidError();
    }
  }

  private assertMatchingIdempotentSelection(
    answer: ExamAttemptAnswerEntity,
    normalizedSelectedOptionIds: readonly string[],
  ): void {
    if (
      !examSelectedOptionSetsEqual(
        parseExamSelectedOptionIdsJson(answer.selectedOptionIdsJson),
        normalizedSelectedOptionIds,
      )
    ) {
      throw new ExamAnswerIdempotencyConflictError();
    }
  }

  private async findExistingAnswerByClientAnswerId(
    rawExamAttemptQuestionId: string,
    rawClientAnswerId: string,
  ): Promise<ExamAttemptAnswerEntity | null> {
    return this.dataSource.getRepository(ExamAttemptAnswerEntity).findOne({
      where: {
        examAttemptQuestionId: normalizeUuid(rawExamAttemptQuestionId),
        clientAnswerId: normalizeUuid(rawClientAnswerId),
      },
    });
  }

  private async findAttemptEntity(rawAttemptId: string): Promise<ExamAttemptEntity> {
    const attempt = await this.dataSource.getRepository(ExamAttemptEntity).findOne({
      where: { id: normalizeUuid(rawAttemptId) },
    });

    if (attempt === null) {
      throw new ExamAttemptNotFoundError();
    }

    return attempt;
  }

  private assertSelectionMatchesDeliveredOptions(
    attemptQuestion: ExamAttemptQuestionEntity,
    projection: LearnerQuestionProjection,
    normalizedSelectedOptionIds: readonly string[],
  ): void {
    const allowedOptionIds = new Set(this.resolveDeliveredOptionOrder(attemptQuestion, projection));

    for (const optionId of normalizedSelectedOptionIds) {
      if (!allowedOptionIds.has(optionId)) {
        throw new ExamAnswerInvalidError();
      }
    }
  }

  private resolveDeliveredOptionOrder(
    attemptQuestion: ExamAttemptQuestionEntity,
    projection: LearnerQuestionProjection,
  ): string[] {
    if (attemptQuestion.deliveredOptionOrderJson === null) {
      return projection.options.map((option) => normalizeUuid(option.id));
    }

    const parsed = JSON.parse(attemptQuestion.deliveredOptionOrderJson) as unknown;

    if (!Array.isArray(parsed)) {
      throw new ExamAnswerInvalidError();
    }

    return parsed.map((value) => {
      if (typeof value !== 'string' || !isUuidV4(value)) {
        throw new ExamAnswerInvalidError();
      }

      return normalizeUuid(value);
    });
  }
}
