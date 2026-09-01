import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import type { LocalizedQuestionDisplayPayload } from '../../localization/interfaces/localization.interface';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LocalizationService } from '../../localization/services/localization.service';
import type { LearnerQuestionProjection } from '../../question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import {
  PracticeSessionNotFoundError,
  PracticeSessionQuestionNotFoundError,
} from '../errors/practice.errors';
import type {
  PracticeSessionQuestionAttemptState,
  PracticeSessionQuestionDelivery,
  PracticeSessionSnapshot,
  PracticeSessionSummary,
} from '../interfaces/practice.interface';
import {
  derivePracticeQuestionAttemptState,
  type PracticeAttemptRecord,
} from '../utils/practice-attempt-state.util';
import { parseSelectedOptionIdsJson } from '../utils/practice-selected-options.util';

@Injectable()
export class PracticeSessionQueryService {
  constructor(
    @InjectRepository(PracticeSessionEntity)
    private readonly practiceSessionRepository: Repository<PracticeSessionEntity>,
    @InjectRepository(PracticeSessionQuestionEntity)
    private readonly practiceSessionQuestionRepository: Repository<PracticeSessionQuestionEntity>,
    @InjectRepository(PracticeAnswerAttemptEntity)
    private readonly practiceAnswerAttemptRepository: Repository<PracticeAnswerAttemptEntity>,
    private readonly questionBankService: QuestionBankService,
    private readonly localizationService: LocalizationService,
    private readonly enrollmentService: EnrollmentService,
    private readonly classService: ClassService,
  ) {}

  async getSessionSnapshot(rawSessionId: string): Promise<PracticeSessionSnapshot> {
    const session = await this.findSessionEntity(rawSessionId);
    const parishId = await this.resolveSessionParishId(session.enrollmentId);
    const sessionQuestions = await this.practiceSessionQuestionRepository.find({
      where: { practiceSessionId: session.id },
      order: { position: 'ASC' },
    });
    const sessionQuestionIds = sessionQuestions.map((question) => question.id);
    const attempts =
      sessionQuestionIds.length === 0
        ? []
        : await this.practiceAnswerAttemptRepository.find({
            where: { practiceSessionQuestionId: In(sessionQuestionIds) },
            order: { attemptNumber: 'ASC' },
          });
    const attemptsByQuestionId = new Map<string, PracticeAnswerAttemptEntity[]>();

    for (const attempt of attempts) {
      const questionId = normalizeUuid(attempt.practiceSessionQuestionId);
      const existing = attemptsByQuestionId.get(questionId) ?? [];
      existing.push(attempt);
      attemptsByQuestionId.set(questionId, existing);
    }

    const projections = await this.questionBankService.getLearnerQuestionProjections(
      sessionQuestions.map((sessionQuestion) => sessionQuestion.questionVersionId),
    );
    const projectionMap = new Map(
      projections.map((projection) => [normalizeUuid(projection.questionVersionId), projection]),
    );
    const localizedDisplays = await this.resolvePinnedQuestionDisplays(sessionQuestions, parishId);

    const questions: PracticeSessionQuestionDelivery[] = [];

    for (const sessionQuestion of sessionQuestions) {
      const projection = projectionMap.get(normalizeUuid(sessionQuestion.questionVersionId));

      if (projection === undefined) {
        throw new PracticeSessionQuestionNotFoundError();
      }

      const localizedDisplay = localizedDisplays.get(normalizeUuid(sessionQuestion.id)) ?? null;

      const questionAttempts = (attemptsByQuestionId.get(normalizeUuid(sessionQuestion.id)) ?? [])
        .sort((left, right) => left.attemptNumber - right.attemptNumber)
        .map((attempt) => this.toAttemptRecord(attempt));
      const attemptState = await this.buildAttemptState(
        sessionQuestion.questionVersionId,
        questionAttempts,
        session.maxAttemptsPerQuestion,
        session.status,
        localizedDisplay?.display.explanation ?? null,
      );

      questions.push(
        this.toQuestionDelivery(sessionQuestion, projection, attemptState, localizedDisplay),
      );
    }

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
      questions,
      summary: this.buildSessionSummary(questions, session.status),
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

  private async buildAttemptState(
    questionVersionId: string,
    attempts: readonly PracticeAttemptRecord[],
    maxAttemptsPerQuestion: number,
    sessionStatus: PracticeSessionStatus,
    localizedExplanation: string | null,
  ): Promise<PracticeSessionQuestionAttemptState> {
    const derived = derivePracticeQuestionAttemptState({
      attempts,
      maxAttemptsPerQuestion,
      sessionStatus,
    });
    const feedback = derived.feedbackRevealed
      ? await this.questionBankService.getPracticeFeedback(questionVersionId)
      : null;

    return {
      attemptCount: derived.attemptCount,
      canRetry: derived.canRetry,
      finalized: derived.finalized,
      remainingAttempts: derived.remainingAttempts,
      feedbackRevealed: derived.feedbackRevealed,
      latestAttempt:
        derived.latestAttempt === null
          ? null
          : {
              attemptId: normalizeUuid(derived.latestAttempt.id),
              attemptNumber: derived.latestAttempt.attemptNumber,
              clientAnswerId: normalizeUuid(derived.latestAttempt.clientAnswerId),
              selectedOptionIds: derived.latestAttempt.selectedOptionIds,
              isCorrect: derived.latestAttempt.isCorrect,
              score: derived.latestAttempt.score,
              submittedAt: derived.latestAttempt.submittedAt,
            },
      feedback:
        feedback === null
          ? null
          : {
              explanation: localizedExplanation ?? feedback.explanation,
              explanationMediaJson: feedback.explanationMediaJson,
              correctOptionIds: feedback.correctOptionIds,
            },
    };
  }

  private async resolveSessionParishId(rawEnrollmentId: string): Promise<string> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);
    const classSnapshot = await this.classService.getClassById(enrollment.classId);

    return classSnapshot.parishId;
  }

  private async resolvePinnedQuestionDisplays(
    sessionQuestions: readonly PracticeSessionQuestionEntity[],
    parishId: string,
  ): Promise<
    Map<
      string,
      {
        readonly display: LocalizedQuestionDisplayPayload;
        readonly deliveredLocale: string;
        readonly translationRevisionId: string | null;
        readonly translationStatus: 'SOURCE' | 'APPROVED' | 'MISSING' | 'STALE';
        readonly isFallback: boolean;
      }
    >
  > {
    const result = new Map<
      string,
      {
        readonly display: LocalizedQuestionDisplayPayload;
        readonly deliveredLocale: string;
        readonly translationRevisionId: string | null;
        readonly translationStatus: 'SOURCE' | 'APPROVED' | 'MISSING' | 'STALE';
        readonly isFallback: boolean;
      }
    >();

    await Promise.all(
      sessionQuestions.map(async (sessionQuestion) => {
        if (sessionQuestion.translationRevisionId === null) {
          return;
        }

        const resolution = await this.localizationService.resolveLocalizedResourceWithRevision({
          resourceType: TranslationResourceType.QuestionBankVersion,
          resourceId: sessionQuestion.questionVersionId,
          translationRevisionId: sessionQuestion.translationRevisionId,
          parishId,
        });
        const display = resolution.payload['display'] as
          LocalizedQuestionDisplayPayload | undefined;

        if (display === undefined) {
          return;
        }

        result.set(normalizeUuid(sessionQuestion.id), {
          display,
          deliveredLocale: sessionQuestion.deliveredLocale ?? resolution.sourceLocale,
          translationRevisionId: sessionQuestion.translationRevisionId,
          translationStatus: resolution.translationStatus,
          isFallback: resolution.isFallback,
        });
      }),
    );

    return result;
  }

  private buildSessionSummary(
    questions: readonly PracticeSessionQuestionDelivery[],
    sessionStatus: PracticeSessionStatus,
  ): PracticeSessionSummary {
    const totalQuestions = questions.length;
    const answeredQuestionCount = questions.filter(
      (question) => question.attemptState.attemptCount > 0,
    ).length;
    const finalizedQuestionCount = questions.filter(
      (question) => question.attemptState.finalized,
    ).length;
    const finalCorrectCount = questions.filter(
      (question) =>
        question.attemptState.latestAttempt !== null &&
        question.attemptState.finalized &&
        question.attemptState.latestAttempt.isCorrect,
    ).length;

    return {
      totalQuestions,
      answeredQuestionCount,
      finalizedQuestionCount,
      finalCorrectCount,
      sessionCompleted: sessionStatus === PracticeSessionStatus.Completed,
    };
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

  private toQuestionDelivery(
    sessionQuestion: PracticeSessionQuestionEntity,
    projection: LearnerQuestionProjection,
    attemptState: PracticeSessionQuestionAttemptState,
    localizedDisplay: {
      readonly display: LocalizedQuestionDisplayPayload;
      readonly deliveredLocale: string;
      readonly translationRevisionId: string | null;
      readonly translationStatus: 'SOURCE' | 'APPROVED' | 'MISSING' | 'STALE';
      readonly isFallback: boolean;
    } | null,
  ): PracticeSessionQuestionDelivery {
    const deliveredOptionIds = this.resolveDeliveredOptionOrder(sessionQuestion, projection);
    const optionMap = new Map(
      projection.options.map((option) => [normalizeUuid(option.id), option] as const),
    );
    const localizedOptionMap = new Map(
      (localizedDisplay?.display.options ?? []).map(
        (option) => [normalizeUuid(option.id), option] as const,
      ),
    );

    return {
      sessionQuestionId: sessionQuestion.id,
      position: sessionQuestion.position,
      questionVersionId: sessionQuestion.questionVersionId,
      questionType: projection.questionType,
      prompt: localizedDisplay?.display.prompt ?? projection.prompt,
      instruction: localizedDisplay?.display.instruction ?? projection.instruction,
      difficulty: projection.difficulty,
      promptMediaJson: projection.promptMediaJson,
      deliveredLocale:
        sessionQuestion.deliveredLocale ?? localizedDisplay?.deliveredLocale ?? 'vi-VN',
      translationRevisionId: sessionQuestion.translationRevisionId,
      translationStatus: localizedDisplay?.translationStatus ?? 'SOURCE',
      isFallback: localizedDisplay?.isFallback ?? false,
      options: deliveredOptionIds.map((optionId, index) => {
        const option = optionMap.get(optionId);

        if (option === undefined) {
          throw new PracticeSessionQuestionNotFoundError();
        }

        const localizedOption = localizedOptionMap.get(optionId);

        return {
          id: option.id,
          text: localizedOption?.text ?? option.text,
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
