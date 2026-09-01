import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  InvalidGradeAnswerInputError,
  InvalidQuestionOptionIdError,
  InvalidQuestionVersionIdError,
  QuestionNotFoundError,
  QuestionVersionNotDeliverableError,
  QuestionVersionNotFoundError,
  QuestionVersionNotGradableError,
} from '../errors/question-bank.errors';
import type {
  GradeAnswerInput,
  GradeAnswerResult,
  ImmutableAssessmentSnapshot,
  LearnerQuestionProjection,
  PracticeFeedbackSnapshot,
  QuestionVersionPreview,
} from '../interfaces/question-bank.interface';

@Injectable()
export class QuestionGradingService {
  constructor(
    @InjectRepository(QuestionVersionEntity)
    private readonly questionVersionRepository: Repository<QuestionVersionEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(QuestionOptionEntity)
    private readonly questionOptionRepository: Repository<QuestionOptionEntity>,
    @InjectRepository(QuestionCorrectOptionEntity)
    private readonly questionCorrectOptionRepository: Repository<QuestionCorrectOptionEntity>,
  ) {}

  async getLearnerQuestionProjection(rawVersionId: string): Promise<LearnerQuestionProjection> {
    const version = await this.findDeliverableVersionEntity(rawVersionId);

    return this.buildLearnerSafeProjection(version);
  }

  async getLearnerQuestionProjections(
    rawVersionIds: readonly string[],
  ): Promise<readonly LearnerQuestionProjection[]> {
    if (rawVersionIds.length === 0) {
      return [];
    }

    const normalizedIds = rawVersionIds.map((rawVersionId) => this.parseVersionId(rawVersionId));
    const uniqueIds = [...new Set(normalizedIds)];
    const versions = await this.questionVersionRepository.find({
      where: { id: In(uniqueIds) },
    });
    const versionMap = new Map(
      versions.map((version) => [normalizeUuid(version.id), version] as const),
    );

    for (const versionId of uniqueIds) {
      const version = versionMap.get(versionId);

      if (version === undefined) {
        throw new QuestionVersionNotFoundError();
      }

      if (
        version.status !== QuestionVersionStatus.Published &&
        version.status !== QuestionVersionStatus.Archived
      ) {
        throw new QuestionVersionNotDeliverableError();
      }
    }

    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: In(uniqueIds) },
      order: { sortOrder: 'ASC' },
    });
    const optionsByVersionId = new Map<string, QuestionOptionEntity[]>();

    for (const option of options) {
      const versionId = normalizeUuid(option.questionVersionId);
      const existing = optionsByVersionId.get(versionId) ?? [];
      existing.push(option);
      optionsByVersionId.set(versionId, existing);
    }

    return normalizedIds.map((versionId) => {
      const version = versionMap.get(versionId);

      if (version === undefined) {
        throw new QuestionVersionNotFoundError();
      }

      const versionOptions = optionsByVersionId.get(versionId) ?? [];

      return {
        questionVersionId: version.id,
        questionType: version.questionType,
        prompt: version.prompt,
        instruction: version.instruction,
        difficulty: version.difficulty,
        promptMediaJson: version.promptMediaJson,
        options: versionOptions.map((option) => ({
          id: option.id,
          text: option.text,
          mediaAssetId: option.mediaAssetId,
          sortOrder: option.sortOrder,
        })),
      };
    });
  }

  async getQuestionVersionPreview(rawVersionId: string): Promise<QuestionVersionPreview> {
    const version = await this.findVersionEntity(rawVersionId);

    return this.buildLearnerSafeProjection(version);
  }

  async gradeAnswer(input: GradeAnswerInput): Promise<GradeAnswerResult> {
    const version = await this.findGradableVersionEntity(input.questionVersionId);
    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: version.id },
    });
    const correctOptions = await this.questionCorrectOptionRepository.find({
      where: { questionVersionId: version.id },
    });

    const selectedOptionIds = this.parseSelectedOptionIds(input.selectedOptionIds);
    this.assertSelectionCount(version.questionType, selectedOptionIds.length);

    const optionIdSet = new Set(options.map((option) => normalizeUuid(option.id)));

    for (const optionId of selectedOptionIds) {
      if (!optionIdSet.has(optionId)) {
        throw new InvalidGradeAnswerInputError();
      }
    }

    const correctOptionIdSet = new Set(correctOptions.map((row) => normalizeUuid(row.optionId)));
    const selectedOptionIdSet = new Set(selectedOptionIds);
    const isCorrect = this.setsEqual(selectedOptionIdSet, correctOptionIdSet);

    return {
      questionVersionId: version.id,
      questionType: version.questionType,
      isCorrect,
      score: isCorrect ? 1 : 0,
    };
  }

  async getPracticeFeedback(rawVersionId: string): Promise<PracticeFeedbackSnapshot> {
    const version = await this.findGradableVersionEntity(rawVersionId);
    const correctOptions = await this.questionCorrectOptionRepository.find({
      where: { questionVersionId: version.id },
    });

    return {
      questionVersionId: version.id,
      explanation: version.explanation,
      explanationMediaJson: version.explanationMediaJson,
      correctOptionIds: correctOptions.map((row) => normalizeUuid(row.optionId)),
    };
  }

  async getImmutableAssessmentSnapshot(rawVersionId: string): Promise<ImmutableAssessmentSnapshot> {
    const version = await this.findGradableVersionEntity(rawVersionId);
    const question = await this.questionRepository.findOne({
      where: { id: version.questionId },
    });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: version.id },
      order: { sortOrder: 'ASC' },
    });
    const correctOptions = await this.questionCorrectOptionRepository.find({
      where: { questionVersionId: version.id },
    });

    return {
      questionVersionId: version.id,
      questionId: version.questionId,
      questionType: version.questionType,
      sourceLocale: question.sourceLocale,
      sourceContentHash: version.sourceContentHash,
      prompt: version.prompt,
      instruction: version.instruction,
      promptMediaJson: version.promptMediaJson,
      options: options.map((option) => ({
        id: option.id,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
        sortOrder: option.sortOrder,
      })),
      correctOptionIds: correctOptions.map((row) => normalizeUuid(row.optionId)),
    };
  }

  private async findVersionEntity(rawVersionId: string): Promise<QuestionVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.questionVersionRepository.findOne({
      where: { id: versionId },
    });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }

    return version;
  }

  private async findDeliverableVersionEntity(rawVersionId: string): Promise<QuestionVersionEntity> {
    const version = await this.findVersionEntity(rawVersionId);

    if (
      version.status !== QuestionVersionStatus.Published &&
      version.status !== QuestionVersionStatus.Archived
    ) {
      throw new QuestionVersionNotDeliverableError();
    }

    return version;
  }

  private async buildLearnerSafeProjection(
    version: QuestionVersionEntity,
  ): Promise<LearnerQuestionProjection> {
    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: version.id },
      order: { sortOrder: 'ASC' },
    });

    return {
      questionVersionId: version.id,
      questionType: version.questionType,
      prompt: version.prompt,
      instruction: version.instruction,
      difficulty: version.difficulty,
      promptMediaJson: version.promptMediaJson,
      options: options.map((option) => ({
        id: option.id,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
        sortOrder: option.sortOrder,
      })),
    };
  }
  private async findGradableVersionEntity(rawVersionId: string): Promise<QuestionVersionEntity> {
    const version = await this.findVersionEntity(rawVersionId);

    if (
      version.status !== QuestionVersionStatus.Published &&
      version.status !== QuestionVersionStatus.Archived
    ) {
      throw new QuestionVersionNotGradableError();
    }

    return version;
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidQuestionVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }

  private parseSelectedOptionIds(optionIds: readonly string[]): string[] {
    if (optionIds.length === 0) {
      throw new InvalidGradeAnswerInputError();
    }

    const normalizedIds = optionIds.map((optionId) => {
      if (!isUuidV4(optionId)) {
        throw new InvalidQuestionOptionIdError();
      }

      return normalizeUuid(optionId);
    });

    if (new Set(normalizedIds).size !== normalizedIds.length) {
      throw new InvalidGradeAnswerInputError();
    }

    return normalizedIds;
  }

  private assertSelectionCount(questionType: QuestionType, count: number): void {
    if (
      (questionType === QuestionType.SingleChoice || questionType === QuestionType.TrueFalse) &&
      count !== 1
    ) {
      throw new InvalidGradeAnswerInputError();
    }

    if (questionType === QuestionType.MultipleChoice && count < 1) {
      throw new InvalidGradeAnswerInputError();
    }
  }

  private setsEqual(left: Set<string>, right: Set<string>): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const value of left) {
      if (!right.has(value)) {
        return false;
      }
    }

    return true;
  }
}
