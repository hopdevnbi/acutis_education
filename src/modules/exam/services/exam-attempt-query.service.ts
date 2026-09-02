import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import type { LocalizedQuestionDisplayPayload } from '../../localization/interfaces/localization.interface';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LearnerTranslationReadStatus } from '../../localization/enums/learner-translation-read-status.enum';
import { LocalizationService } from '../../localization/services/localization.service';
import type { LearnerQuestionProjection } from '../../question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { ExamAttemptAnswerEntity } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptQuestionEntity } from '../entities/exam-attempt-question.entity';
import {
  ExamAttemptNotFoundError,
  ExamAttemptQuestionNotFoundError,
  InvalidExamAttemptIdError,
} from '../errors/exam.errors';
import type {
  ExamAttemptAnswerSnapshot,
  ExamAttemptDeliverySnapshot,
  ExamAttemptQuestionDelivery,
  ExamAttemptQuestionOptionDelivery,
} from '../interfaces/exam-attempt.interface';
import { ExamAttemptAccessService } from './exam-attempt-access.service';
import { ExamService } from './exam.service';

@Injectable()
export class ExamAttemptQueryService {
  constructor(
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(ExamAttemptQuestionEntity)
    private readonly examAttemptQuestionRepository: Repository<ExamAttemptQuestionEntity>,
    @InjectRepository(ExamAttemptAnswerEntity)
    private readonly examAttemptAnswerRepository: Repository<ExamAttemptAnswerEntity>,
    private readonly examService: ExamService,
    private readonly questionBankService: QuestionBankService,
    private readonly localizationService: LocalizationService,
    private readonly examAttemptAccessService: ExamAttemptAccessService,
  ) {}

  async getAttemptDelivery(
    rawAttemptId: string,
    rawActorUserId: string,
  ): Promise<ExamAttemptDeliverySnapshot> {
    const attempt = await this.findAttemptEntity(rawAttemptId);
    await this.examAttemptAccessService.assertCanAttemptAsLinkedStudent(
      rawActorUserId,
      attempt.studentId,
    );

    const version = await this.examService.getVersionById(attempt.examVersionId);
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
    const localizedDisplays = await this.resolvePinnedQuestionDisplays(
      attemptQuestions,
      attempt.parishId,
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

    const questionDeliveries: ExamAttemptQuestionDelivery[] = [];

    for (const attemptQuestion of attemptQuestions) {
      const projection = projectionMap.get(normalizeUuid(attemptQuestion.questionVersionId));

      if (projection === undefined) {
        throw new ExamAttemptQuestionNotFoundError();
      }

      const localizedDisplay = localizedDisplays.get(normalizeUuid(attemptQuestion.id)) ?? null;

      questionDeliveries.push(
        this.toQuestionDelivery(attemptQuestion, projection, localizedDisplay),
      );
    }

    const answerSnapshots: ExamAttemptAnswerSnapshot[] = attemptQuestions
      .map((attemptQuestion) => {
        const answer = answersByQuestionId.get(normalizeUuid(attemptQuestion.id));

        if (answer === undefined) {
          return null;
        }

        return {
          examAttemptQuestionId: attemptQuestion.id,
          selectedOptionIds: this.parseSelectedOptionIdsJson(answer.selectedOptionIdsJson),
          savedAt: answer.savedAt,
        };
      })
      .filter((answer): answer is ExamAttemptAnswerSnapshot => answer !== null);

    const serverTime = new Date();

    return {
      id: attempt.id,
      examAssignmentId: attempt.examAssignmentId,
      enrollmentId: attempt.enrollmentId,
      attemptNumber: attempt.attemptNumber,
      startedByUserId: attempt.startedByUserId,
      status: attempt.status,
      examId: attempt.examId,
      examVersionId: attempt.examVersionId,
      studentId: attempt.studentId,
      classId: attempt.classId,
      parishId: attempt.parishId,
      examTitleDelivered: attempt.examTitleDelivered,
      instructionsDelivered: attempt.instructionsDelivered,
      deliveredLocale: attempt.deliveredLocale,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
      questionCount: attempt.questionCount,
      maxAttempts: version.maxAttempts,
      serverTime,
      questions: questionDeliveries,
      answers: answerSnapshots,
    };
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

  private async resolvePinnedQuestionDisplays(
    attemptQuestions: readonly ExamAttemptQuestionEntity[],
    parishId: string,
  ): Promise<
    Map<
      string,
      {
        readonly display: LocalizedQuestionDisplayPayload;
        readonly deliveredLocale: string;
        readonly translationRevisionId: string | null;
        readonly translationStatus: LearnerTranslationReadStatus;
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
        readonly translationStatus: LearnerTranslationReadStatus;
        readonly isFallback: boolean;
      }
    >();

    await Promise.all(
      attemptQuestions.map(async (attemptQuestion) => {
        if (attemptQuestion.translationRevisionId === null) {
          return;
        }

        const resolution = await this.localizationService.resolveLocalizedResourceWithRevision({
          resourceType: TranslationResourceType.QuestionBankVersion,
          resourceId: attemptQuestion.questionVersionId,
          translationRevisionId: attemptQuestion.translationRevisionId,
          parishId,
        });
        const display = resolution.payload['display'] as
          LocalizedQuestionDisplayPayload | undefined;

        if (display === undefined) {
          return;
        }

        result.set(normalizeUuid(attemptQuestion.id), {
          display,
          deliveredLocale: attemptQuestion.deliveredLocale ?? resolution.sourceLocale,
          translationRevisionId: attemptQuestion.translationRevisionId,
          translationStatus: resolution.translationStatus,
          isFallback: resolution.isFallback,
        });
      }),
    );

    return result;
  }

  private toQuestionDelivery(
    attemptQuestion: ExamAttemptQuestionEntity,
    projection: LearnerQuestionProjection,
    localizedDisplay: {
      readonly display: LocalizedQuestionDisplayPayload;
      readonly deliveredLocale: string;
      readonly translationRevisionId: string | null;
      readonly translationStatus: LearnerTranslationReadStatus;
      readonly isFallback: boolean;
    } | null,
  ): ExamAttemptQuestionDelivery {
    const deliveredOptionIds = this.resolveDeliveredOptionOrder(attemptQuestion, projection);
    const optionMap = new Map(
      projection.options.map((option) => [normalizeUuid(option.id), option] as const),
    );
    const localizedOptionMap = new Map(
      (localizedDisplay?.display.options ?? []).map(
        (option) => [normalizeUuid(option.id), option] as const,
      ),
    );
    const options: ExamAttemptQuestionOptionDelivery[] = deliveredOptionIds.map(
      (optionId, index) => {
        const option = optionMap.get(optionId);

        if (option === undefined) {
          throw new ExamAttemptQuestionNotFoundError();
        }

        const localizedOption = localizedOptionMap.get(optionId);

        return {
          id: option.id,
          text: localizedOption?.text ?? option.text,
          mediaAssetId: option.mediaAssetId,
          sortOrder: index + 1,
        };
      },
    );

    return {
      examAttemptQuestionId: attemptQuestion.id,
      sortOrder: attemptQuestion.sortOrder,
      questionId: attemptQuestion.questionId,
      questionVersionId: attemptQuestion.questionVersionId,
      questionType: projection.questionType,
      prompt: localizedDisplay?.display.prompt ?? projection.prompt,
      instruction: localizedDisplay?.display.instruction ?? projection.instruction,
      promptMediaJson: projection.promptMediaJson,
      deliveredLocale:
        attemptQuestion.deliveredLocale ?? localizedDisplay?.deliveredLocale ?? 'vi-VN',
      translationRevisionId: attemptQuestion.translationRevisionId,
      translationStatus: localizedDisplay?.translationStatus ?? LearnerTranslationReadStatus.Source,
      isFallback: localizedDisplay?.isFallback ?? false,
      options,
    };
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
      throw new ExamAttemptQuestionNotFoundError();
    }

    return parsed.map((value) => {
      if (typeof value !== 'string') {
        throw new ExamAttemptQuestionNotFoundError();
      }

      return normalizeUuid(value);
    });
  }

  private parseSelectedOptionIdsJson(rawJson: string): readonly string[] {
    const parsed = JSON.parse(rawJson) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeUuid(value));
  }
}
