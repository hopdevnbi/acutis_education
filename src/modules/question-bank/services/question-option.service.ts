import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { generateUuidV4, isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { MediaCategory } from '../../media/enums/media-category.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { MediaAssetService } from '../../media/services/media-asset.service';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  TRUE_FALSE_OPTION_CODE_FALSE,
  TRUE_FALSE_OPTION_CODE_TRUE,
} from '../constants/question-option.constants';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  DuplicateQuestionOptionCodeError,
  InvalidCorrectOptionIdsError,
  InvalidQuestionOptionCountError,
  InvalidQuestionOptionIdError,
  InvalidQuestionOptionRepresentationError,
  InvalidQuestionOptionSortOrderError,
  InvalidQuestionVersionIdError,
  QuestionInactiveError,
  QuestionVersionNotDraftError,
  QuestionVersionNotFoundError,
} from '../errors/question-bank.errors';
import type {
  QuestionOptionSnapshot,
  ReplaceQuestionOptionInput,
} from '../interfaces/question-bank.interface';
import { toQuestionOptionSnapshot } from '../mappers/question-bank.mapper';
import { parseQuestionOptionCode } from '../utils/question-option-code.util';
import { parseQuestionOptionText } from '../utils/question-option-text.util';
import { computeQuestionSourceContentHash } from '../utils/question-source-content-hash.util';

@Injectable()
export class QuestionOptionService {
  constructor(
    @InjectRepository(QuestionOptionEntity)
    private readonly questionOptionRepository: Repository<QuestionOptionEntity>,
    @InjectRepository(QuestionCorrectOptionEntity)
    private readonly questionCorrectOptionRepository: Repository<QuestionCorrectOptionEntity>,
    @InjectRepository(QuestionVersionEntity)
    private readonly questionVersionRepository: Repository<QuestionVersionEntity>,
    private readonly mediaAssetService: MediaAssetService,
    private readonly dataSource: DataSource,
  ) {}

  async listOptionsByVersion(rawVersionId: string): Promise<QuestionOptionSnapshot[]> {
    const versionId = this.parseVersionId(rawVersionId);
    await this.assertVersionExists(versionId);

    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: versionId },
      order: { sortOrder: 'ASC' },
    });

    return options.map(toQuestionOptionSnapshot);
  }

  async getCorrectOptionIdsByVersion(rawVersionId: string): Promise<string[]> {
    const versionId = this.parseVersionId(rawVersionId);
    await this.assertVersionExists(versionId);

    const correctOptions = await this.questionCorrectOptionRepository.find({
      where: { questionVersionId: versionId },
    });

    return correctOptions.map((row) => normalizeUuid(row.optionId));
  }

  async replaceDraftOptions(
    rawVersionId: string,
    items: readonly ReplaceQuestionOptionInput[],
  ): Promise<QuestionOptionSnapshot[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const version = await this.findVersionForMutation(entityManager, rawVersionId);
      const parsedItems = await this.parseReplaceItems(items);

      await entityManager.delete(QuestionCorrectOptionEntity, {
        questionVersionId: version.id,
      });
      await entityManager.delete(QuestionOptionEntity, {
        questionVersionId: version.id,
      });

      const savedOptions: QuestionOptionEntity[] = [];

      for (const item of parsedItems) {
        const option = entityManager.create(QuestionOptionEntity, {
          id: generateUuidV4(),
          questionVersionId: version.id,
          code: item.code,
          text: item.text,
          mediaAssetId: item.mediaAssetId,
          sortOrder: item.sortOrder,
        });

        savedOptions.push(await entityManager.save(QuestionOptionEntity, option));
      }

      await this.recomputeSourceContentHash(entityManager, version.id);

      return savedOptions.map(toQuestionOptionSnapshot);
    });
  }

  async setCorrectOptions(rawVersionId: string, optionIds: readonly string[]): Promise<string[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const version = await this.findVersionForMutation(entityManager, rawVersionId);
      const normalizedOptionIds = this.parseOptionIds(optionIds);

      const options = await entityManager.find(QuestionOptionEntity, {
        where: { questionVersionId: version.id },
      });
      const optionIdSet = new Set(options.map((option) => normalizeUuid(option.id)));

      for (const optionId of normalizedOptionIds) {
        if (!optionIdSet.has(optionId)) {
          throw new InvalidCorrectOptionIdsError();
        }
      }

      this.assertCorrectOptionCount(version.questionType, normalizedOptionIds.length);

      await entityManager.delete(QuestionCorrectOptionEntity, {
        questionVersionId: version.id,
      });

      for (const optionId of normalizedOptionIds) {
        const correctOption = entityManager.create(QuestionCorrectOptionEntity, {
          questionVersionId: version.id,
          optionId,
        });

        await entityManager.save(QuestionCorrectOptionEntity, correctOption);
      }

      return normalizedOptionIds;
    });
  }

  async ensureTrueFalseOptions(rawVersionId: string, entityManager?: EntityManager): Promise<void> {
    const versionId = this.parseVersionId(rawVersionId);
    const manager = entityManager ?? this.questionOptionRepository.manager;
    const version = await manager.findOne(QuestionVersionEntity, {
      where: { id: versionId },
    });

    if (version === null || version.questionType !== QuestionType.TrueFalse) {
      return;
    }

    const existingCount = await manager.count(QuestionOptionEntity, {
      where: { questionVersionId: versionId },
    });

    if (existingCount > 0) {
      return;
    }

    const trueOption = manager.create(QuestionOptionEntity, {
      id: generateUuidV4(),
      questionVersionId: versionId,
      code: TRUE_FALSE_OPTION_CODE_TRUE,
      text: 'True',
      mediaAssetId: null,
      sortOrder: 1,
    });
    const falseOption = manager.create(QuestionOptionEntity, {
      id: generateUuidV4(),
      questionVersionId: versionId,
      code: TRUE_FALSE_OPTION_CODE_FALSE,
      text: 'False',
      mediaAssetId: null,
      sortOrder: 2,
    });

    await manager.save(QuestionOptionEntity, trueOption);
    await manager.save(QuestionOptionEntity, falseOption);
    await this.recomputeSourceContentHash(manager, versionId);
  }

  async recomputeSourceContentHash(
    entityManager: EntityManager,
    versionId: string,
  ): Promise<string> {
    const version = await entityManager.findOne(QuestionVersionEntity, {
      where: { id: versionId },
    });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }

    const options = await entityManager.find(QuestionOptionEntity, {
      where: { questionVersionId: versionId },
      order: { sortOrder: 'ASC' },
    });

    const sourceContentHash = computeQuestionSourceContentHash({
      prompt: version.prompt,
      instruction: version.instruction,
      explanation: version.explanation,
      promptMediaJson: version.promptMediaJson,
      explanationMediaJson: version.explanationMediaJson,
      options: options.map(toQuestionOptionSnapshot),
    });

    version.sourceContentHash = sourceContentHash;
    await entityManager.save(QuestionVersionEntity, version);

    return sourceContentHash;
  }

  private async parseReplaceItems(items: readonly ReplaceQuestionOptionInput[]): Promise<
    Array<{
      code: string | null;
      text: string | null;
      mediaAssetId: string | null;
      sortOrder: number;
    }>
  > {
    if (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS) {
      throw new InvalidQuestionOptionCountError();
    }

    const sortOrders = new Set<number>();
    const codes = new Set<string>();
    const parsedItems: Array<{
      code: string | null;
      text: string | null;
      mediaAssetId: string | null;
      sortOrder: number;
    }> = [];

    for (const item of items) {
      if (!Number.isInteger(item.sortOrder) || item.sortOrder < 1) {
        throw new InvalidQuestionOptionSortOrderError();
      }

      if (sortOrders.has(item.sortOrder)) {
        throw new InvalidQuestionOptionSortOrderError();
      }

      sortOrders.add(item.sortOrder);

      const code = parseQuestionOptionCode(item.code);
      const text = parseQuestionOptionText(item.text);
      const mediaAssetId = this.parseMediaAssetId(item.mediaAssetId);

      if (text === null && mediaAssetId === null) {
        throw new InvalidQuestionOptionRepresentationError();
      }

      if (code !== null) {
        if (codes.has(code)) {
          throw new DuplicateQuestionOptionCodeError();
        }

        codes.add(code);
      }

      if (mediaAssetId !== null) {
        await this.assertImageAsset(mediaAssetId);
      }

      parsedItems.push({
        code,
        text,
        mediaAssetId,
        sortOrder: item.sortOrder,
      });
    }

    return parsedItems.sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private async findVersionForMutation(
    entityManager: EntityManager,
    rawVersionId: string,
  ): Promise<QuestionVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await entityManager.findOne(QuestionVersionEntity, {
      where: { id: versionId },
    });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }

    if (version.status !== QuestionVersionStatus.Draft) {
      throw new QuestionVersionNotDraftError();
    }

    const question = await entityManager.findOne(QuestionEntity, {
      where: { id: version.questionId },
    });

    if (question === null) {
      throw new QuestionVersionNotFoundError();
    }

    if (question.status !== QuestionStatus.Active) {
      throw new QuestionInactiveError();
    }

    return version;
  }

  private async assertVersionExists(versionId: string): Promise<void> {
    const version = await this.questionVersionRepository.findOne({
      where: { id: versionId },
    });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidQuestionVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }

  private parseOptionIds(optionIds: readonly string[]): string[] {
    if (optionIds.length === 0) {
      throw new InvalidCorrectOptionIdsError();
    }

    const normalizedIds = optionIds.map((optionId) => {
      if (!isUuidV4(optionId)) {
        throw new InvalidQuestionOptionIdError();
      }

      return normalizeUuid(optionId);
    });

    if (new Set(normalizedIds).size !== normalizedIds.length) {
      throw new InvalidCorrectOptionIdsError();
    }

    return normalizedIds;
  }

  private parseMediaAssetId(rawMediaAssetId: string | null | undefined): string | null {
    if (rawMediaAssetId === undefined || rawMediaAssetId === null) {
      return null;
    }

    const trimmed = rawMediaAssetId.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (!isUuidV4(trimmed)) {
      throw new InvalidQuestionOptionRepresentationError();
    }

    return normalizeUuid(trimmed);
  }

  private async assertImageAsset(assetId: string): Promise<void> {
    try {
      await this.mediaAssetService.assertAssetCategory(assetId, MediaCategory.Image);
    } catch (error: unknown) {
      if (
        error instanceof MediaAssetNotFoundError ||
        error instanceof MediaAssetNotReadyError ||
        error instanceof MediaAssetCategoryMismatchError
      ) {
        throw error;
      }

      throw error;
    }
  }

  private assertCorrectOptionCount(questionType: QuestionType, count: number): void {
    if (count < 1) {
      throw new InvalidCorrectOptionIdsError();
    }

    if (
      (questionType === QuestionType.SingleChoice || questionType === QuestionType.TrueFalse) &&
      count !== 1
    ) {
      throw new InvalidCorrectOptionIdsError();
    }
  }
}
