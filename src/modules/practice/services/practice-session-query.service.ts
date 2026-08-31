import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import type { LearnerQuestionProjection } from '../../question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import {
  PracticeSessionNotFoundError,
  PracticeSessionQuestionNotFoundError,
} from '../errors/practice.errors';
import type {
  PracticeSessionQuestionAttemptState,
  PracticeSessionQuestionDelivery,
  PracticeSessionSnapshot,
} from '../interfaces/practice.interface';

@Injectable()
export class PracticeSessionQueryService {
  constructor(
    @InjectRepository(PracticeSessionEntity)
    private readonly practiceSessionRepository: Repository<PracticeSessionEntity>,
    @InjectRepository(PracticeSessionQuestionEntity)
    private readonly practiceSessionQuestionRepository: Repository<PracticeSessionQuestionEntity>,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async getSessionSnapshot(rawSessionId: string): Promise<PracticeSessionSnapshot> {
    const session = await this.findSessionEntity(rawSessionId);
    const sessionQuestions = await this.practiceSessionQuestionRepository.find({
      where: { practiceSessionId: session.id },
      order: { position: 'ASC' },
    });
    const projections = await this.questionBankService.getLearnerQuestionProjections(
      sessionQuestions.map((sessionQuestion) => sessionQuestion.questionVersionId),
    );
    const projectionMap = new Map(
      projections.map((projection) => [normalizeUuid(projection.questionVersionId), projection]),
    );

    return {
      id: session.id,
      enrollmentId: session.enrollmentId,
      sessionType: session.sessionType,
      status: session.status,
      locale: session.locale,
      curriculumId: session.curriculumId,
      canonicalLessonKey: session.canonicalLessonKey,
      requestedQuestionCount: session.requestedQuestionCount,
      maxAttemptsPerQuestion: session.maxAttemptsPerQuestion,
      randomizeQuestions: session.randomizeQuestions,
      randomizeOptions: session.randomizeOptions,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      abandonedAt: session.abandonedAt,
      questions: sessionQuestions.map((sessionQuestion) =>
        this.toQuestionDelivery(
          sessionQuestion,
          projectionMap.get(normalizeUuid(sessionQuestion.questionVersionId)),
        ),
      ),
    };
  }

  async findSessionQuestionEntity(
    rawSessionId: string,
    rawSessionQuestionId: string,
  ): Promise<PracticeSessionQuestionEntity> {
    const sessionId = normalizeUuid(rawSessionId);
    const sessionQuestionId = normalizeUuid(rawSessionQuestionId);
    const sessionQuestion = await this.practiceSessionQuestionRepository.findOne({
      where: { id: sessionQuestionId },
    });

    if (
      sessionQuestion === null ||
      normalizeUuid(sessionQuestion.practiceSessionId) !== sessionId
    ) {
      throw new PracticeSessionQuestionNotFoundError();
    }

    return sessionQuestion;
  }

  async findSessionEntity(rawSessionId: string): Promise<PracticeSessionEntity> {
    const session = await this.practiceSessionRepository.findOne({
      where: { id: normalizeUuid(rawSessionId) },
    });

    if (session === null) {
      throw new PracticeSessionNotFoundError();
    }

    return session;
  }

  async findExistingSessionByClientRequestId(
    rawEnrollmentId: string,
    rawClientRequestId: string,
  ): Promise<PracticeSessionEntity | null> {
    return this.practiceSessionRepository.findOne({
      where: {
        enrollmentId: normalizeUuid(rawEnrollmentId),
        clientRequestId: normalizeUuid(rawClientRequestId),
      },
    });
  }

  private toQuestionDelivery(
    sessionQuestion: PracticeSessionQuestionEntity,
    projection: LearnerQuestionProjection | undefined,
  ): PracticeSessionQuestionDelivery {
    if (projection === undefined) {
      throw new PracticeSessionQuestionNotFoundError();
    }

    const deliveredOptionIds = this.resolveDeliveredOptionOrder(sessionQuestion, projection);
    const optionMap = new Map(
      projection.options.map((option) => [normalizeUuid(option.id), option] as const),
    );
    const attemptState: PracticeSessionQuestionAttemptState = {
      attemptCount: 0,
      canRetry: true,
      finalized: false,
    };

    return {
      sessionQuestionId: sessionQuestion.id,
      position: sessionQuestion.position,
      questionVersionId: sessionQuestion.questionVersionId,
      questionType: projection.questionType,
      prompt: projection.prompt,
      instruction: projection.instruction,
      difficulty: projection.difficulty,
      promptMediaJson: projection.promptMediaJson,
      options: deliveredOptionIds.map((optionId, index) => {
        const option = optionMap.get(optionId);

        if (option === undefined) {
          throw new PracticeSessionQuestionNotFoundError();
        }

        return {
          id: option.id,
          text: option.text,
          mediaAssetId: option.mediaAssetId,
          sortOrder: option.sortOrder,
          deliveredPosition: index + 1,
        };
      }),
      attemptState,
    };
  }

  private resolveDeliveredOptionOrder(
    sessionQuestion: PracticeSessionQuestionEntity,
    projection: LearnerQuestionProjection,
  ): string[] {
    if (sessionQuestion.deliveredOptionOrderJson === null) {
      return projection.options.map((option) => normalizeUuid(option.id));
    }

    const parsed = JSON.parse(sessionQuestion.deliveredOptionOrderJson) as unknown;

    if (!Array.isArray(parsed)) {
      throw new PracticeSessionQuestionNotFoundError();
    }

    return parsed.map((value) => {
      if (typeof value !== 'string') {
        throw new PracticeSessionQuestionNotFoundError();
      }

      return normalizeUuid(value);
    });
  }
}
