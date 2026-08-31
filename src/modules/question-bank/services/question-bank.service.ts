import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { generateUuidV4, isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { InvalidCurriculumSourceLocaleError } from '../../curriculum/errors/curriculum.errors';
import { parseSourceLocale } from '../../curriculum/utils/curriculum-source-locale.util';
import { MediaCategory } from '../../media/enums/media-category.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { ParishService } from '../../parish/services/parish.service';
import { MAX_OPTIONS, MIN_OPTIONS } from '../constants/question-option.constants';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  InvalidQuestionDifficultyError,
  InvalidQuestionSourceLocaleError,
  InvalidQuestionTypeError,
  QuestionBlankDraftNotAllowedError,
  QuestionCloneSourceInvalidError,
  QuestionCodeAlreadyExistsError,
  QuestionDraftAlreadyExistsError,
  QuestionInactiveError,
  QuestionNoPublishedVersionError,
  QuestionNotFoundError,
  QuestionPublishValidationError,
  QuestionSourceLocaleImmutableError,
  QuestionTypeChangeNotAllowedError,
  QuestionUpdateRequiresFieldsError,
  QuestionVersionNotCloneableError,
  QuestionVersionNotDraftError,
  QuestionVersionNotFoundError,
  QuestionVersionNumberConflictError,
  InvalidQuestionIdError,
  InvalidQuestionVersionIdError,
  type QuestionPublishValidationIssue,
} from '../errors/question-bank.errors';
import type {
  CreateQuestionInput,
  CreateQuestionResult,
  CreateQuestionVersionInput,
  GradeAnswerInput,
  GradeAnswerResult,
  ImmutableAssessmentSnapshot,
  LearnerQuestionProjection,
  ListQuestionVersionsInput,
  ListQuestionsInput,
  ListQuestionsResult,
  PublishedQuestionSelectionSnapshot,
  QuestionAuthoringSnapshot,
  QuestionSnapshot,
  QuestionVersionPreview,
  QuestionVersionSnapshot,
  UpdateQuestionInput,
  UpdateQuestionVersionInput,
} from '../interfaces/question-bank.interface';
import {
  toQuestionOptionSnapshot,
  toQuestionSnapshot,
  toQuestionVersionSnapshot,
} from '../mappers/question-bank.mapper';
import { parseQuestionCode } from '../utils/question-code.util';
import {
  collectQuestionMediaJsonValidationIssues,
  parseOptionalQuestionMediaJson,
  toPublishValidationIssues,
  validateQuestionMediaJsonAssets,
} from '../utils/question-media-json.util';
import {
  parseQuestionExplanation,
  parseQuestionInstruction,
  parseQuestionPrompt,
} from '../utils/question-text.util';
import { QuestionGradingService } from './question-grading.service';
import { QuestionOptionService } from './question-option.service';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(QuestionVersionEntity)
    private readonly questionVersionRepository: Repository<QuestionVersionEntity>,
    private readonly parishService: ParishService,
    private readonly questionOptionService: QuestionOptionService,
    private readonly questionGradingService: QuestionGradingService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly dataSource: DataSource,
  ) {}

  async createQuestion(
    rawParishId: string,
    input: CreateQuestionInput,
  ): Promise<CreateQuestionResult> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);
    const sourceLocale = this.parseQuestionSourceLocale(input.sourceLocale);
    const questionType = this.parseQuestionType(input.draft.questionType);
    const prompt = parseQuestionPrompt(input.draft.prompt);
    const instruction = parseQuestionInstruction(input.draft.instruction);
    const explanation = parseQuestionExplanation(input.draft.explanation);
    const difficulty = this.parseQuestionDifficulty(input.draft.difficulty);

    return this.dataSource.transaction(async (entityManager) => {
      const question = entityManager.create(QuestionEntity, {
        parishId: parishSnapshot.id,
        code: parseQuestionCode(input.code),
        status: QuestionStatus.Active,
        sourceLocale,
        currentPublishedVersionId: null,
        createdByUserId: normalizeUuid(input.createdByUserId),
      });

      let savedQuestion: QuestionEntity;

      try {
        savedQuestion = await entityManager.save(QuestionEntity, question);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error) && question.code !== null) {
          throw new QuestionCodeAlreadyExistsError(question.code);
        }

        throw error;
      }

      const version = entityManager.create(QuestionVersionEntity, {
        questionId: savedQuestion.id,
        versionNumber: 1,
        status: QuestionVersionStatus.Draft,
        questionType,
        prompt,
        instruction,
        explanation,
        promptMediaJson: null,
        explanationMediaJson: null,
        answerDefinitionJson: null,
        difficulty,
        sourceContentHash: null,
        createdByUserId: normalizeUuid(input.createdByUserId),
        publishedByUserId: null,
        publishedAt: null,
      });

      try {
        const savedVersion = await entityManager.save(QuestionVersionEntity, version);

        if (questionType === QuestionType.TrueFalse) {
          await this.questionOptionService.ensureTrueFalseOptions(savedVersion.id, entityManager);
        }

        const refreshedVersion = await entityManager.findOne(QuestionVersionEntity, {
          where: { id: savedVersion.id },
        });

        return {
          question: toQuestionSnapshot(savedQuestion),
          initialVersion: toQuestionVersionSnapshot(refreshedVersion ?? savedVersion),
        };
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw this.mapVersionUniqueConstraintError(error);
        }

        throw error;
      }
    });
  }

  async getQuestionById(rawQuestionId: string): Promise<QuestionSnapshot> {
    const question = await this.findQuestionEntity(rawQuestionId);

    return toQuestionSnapshot(question);
  }

  async listQuestionsByParish(
    rawParishId: string,
    input: ListQuestionsInput,
  ): Promise<ListQuestionsResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.parishId = :parishId', { parishId: parishSnapshot.id });

    this.applyQuestionListFilters(queryBuilder, input);

    const sortColumn = this.resolveQuestionSortColumn(input.sortBy);
    queryBuilder.orderBy(sortColumn, input.sort);

    const total = await queryBuilder.getCount();
    const entities = await queryBuilder
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getMany();

    return {
      items: entities.map(toQuestionSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateQuestion(
    rawQuestionId: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionSnapshot> {
    if (input.code === undefined && input.sourceLocale === undefined) {
      throw new QuestionUpdateRequiresFieldsError();
    }

    const question = await this.findQuestionEntity(rawQuestionId);
    this.assertQuestionActive(question);

    if (input.sourceLocale !== undefined) {
      await this.assertSourceLocaleMutable(question.id, question.currentPublishedVersionId);
      question.sourceLocale = this.parseQuestionSourceLocale(input.sourceLocale);
    }

    if (input.code !== undefined) {
      question.code = parseQuestionCode(input.code);
    }

    try {
      const savedQuestion = await this.questionRepository.save(question);

      return toQuestionSnapshot(savedQuestion);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error) && question.code !== null) {
        throw new QuestionCodeAlreadyExistsError(question.code);
      }

      throw error;
    }
  }

  async updateQuestionStatus(
    rawQuestionId: string,
    status: QuestionStatus,
  ): Promise<QuestionSnapshot> {
    const question = await this.findQuestionEntity(rawQuestionId);
    question.status = status;

    const savedQuestion = await this.questionRepository.save(question);

    return toQuestionSnapshot(savedQuestion);
  }

  async getQuestionParishId(rawQuestionId: string): Promise<string> {
    const question = await this.findQuestionEntity(rawQuestionId);

    return normalizeUuid(question.parishId);
  }

  async listVersionsByQuestion(
    rawQuestionId: string,
    input: ListQuestionVersionsInput,
  ): Promise<QuestionVersionSnapshot[]> {
    const questionId = this.parseQuestionId(rawQuestionId);
    await this.findQuestionEntity(questionId);

    const queryBuilder = this.questionVersionRepository
      .createQueryBuilder('version')
      .where('version.questionId = :questionId', { questionId });

    if (input.status !== undefined) {
      queryBuilder.andWhere('version.status = :status', { status: input.status });
    }

    const versions = await queryBuilder
      .orderBy('version.versionNumber', 'DESC')
      .addOrderBy('version.createdAt', 'DESC')
      .getMany();

    return versions.map(toQuestionVersionSnapshot);
  }

  async getVersionById(rawVersionId: string): Promise<QuestionVersionSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);

    return toQuestionVersionSnapshot(version);
  }

  async getVersionQuestionParishId(rawVersionId: string): Promise<string> {
    const version = await this.findVersionEntity(rawVersionId);
    const question = await this.findQuestionEntity(version.questionId);

    return normalizeUuid(question.parishId);
  }

  async createDraftVersion(
    rawQuestionId: string,
    input: CreateQuestionVersionInput,
  ): Promise<QuestionVersionSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const question = await entityManager.findOne(QuestionEntity, {
        where: { id: this.parseQuestionId(rawQuestionId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (question === null) {
        throw new QuestionNotFoundError();
      }

      this.assertQuestionActive(question);

      const existingDraft = await entityManager.findOne(QuestionVersionEntity, {
        where: {
          questionId: question.id,
          status: QuestionVersionStatus.Draft,
        },
      });

      if (existingDraft !== null) {
        throw new QuestionDraftAlreadyExistsError();
      }

      const publishedOrArchivedCount = await entityManager.count(QuestionVersionEntity, {
        where: [
          { questionId: question.id, status: QuestionVersionStatus.Published },
          { questionId: question.id, status: QuestionVersionStatus.Archived },
        ],
      });

      if (publishedOrArchivedCount > 0) {
        throw new QuestionBlankDraftNotAllowedError();
      }

      const maxVersionNumber = await entityManager
        .createQueryBuilder(QuestionVersionEntity, 'version')
        .select('MAX(version.versionNumber)', 'maxVersionNumber')
        .where('version.questionId = :questionId', { questionId: question.id })
        .getRawOne<{ maxVersionNumber: number | null }>();

      const nextVersionNumber = (maxVersionNumber?.maxVersionNumber ?? 0) + 1;
      const questionType = this.parseQuestionType(input.questionType);

      const version = entityManager.create(QuestionVersionEntity, {
        questionId: question.id,
        versionNumber: nextVersionNumber,
        status: QuestionVersionStatus.Draft,
        questionType,
        prompt: parseQuestionPrompt(input.prompt),
        instruction: parseQuestionInstruction(input.instruction),
        explanation: parseQuestionExplanation(input.explanation),
        promptMediaJson: null,
        explanationMediaJson: null,
        answerDefinitionJson: null,
        difficulty: this.parseQuestionDifficulty(input.difficulty),
        sourceContentHash: null,
        createdByUserId: normalizeUuid(input.createdByUserId),
        publishedByUserId: null,
        publishedAt: null,
      });

      try {
        const savedVersion = await entityManager.save(QuestionVersionEntity, version);

        if (questionType === QuestionType.TrueFalse) {
          await this.questionOptionService.ensureTrueFalseOptions(savedVersion.id, entityManager);
        }

        const refreshedVersion = await entityManager.findOne(QuestionVersionEntity, {
          where: { id: savedVersion.id },
        });

        return toQuestionVersionSnapshot(refreshedVersion ?? savedVersion);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw this.mapVersionUniqueConstraintError(error);
        }

        throw error;
      }
    });
  }

  async updateDraftVersion(
    rawVersionId: string,
    input: UpdateQuestionVersionInput,
  ): Promise<QuestionVersionSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);

    if (version.status !== QuestionVersionStatus.Draft) {
      throw new QuestionVersionNotDraftError();
    }

    const question = await this.findQuestionEntity(version.questionId);
    this.assertQuestionActive(question);

    if (input.questionType !== undefined) {
      const nextQuestionType = this.parseQuestionType(input.questionType);

      if (nextQuestionType !== version.questionType) {
        const existingOptions = await this.questionOptionService.listOptionsByVersion(version.id);
        const existingCorrectOptionIds =
          await this.questionOptionService.getCorrectOptionIdsByVersion(version.id);

        if (existingOptions.length > 0 || existingCorrectOptionIds.length > 0) {
          throw new QuestionTypeChangeNotAllowedError();
        }

        version.questionType = nextQuestionType;
      }
    }

    if (input.prompt !== undefined) {
      version.prompt = parseQuestionPrompt(input.prompt);
    }

    if (input.instruction !== undefined) {
      version.instruction = parseQuestionInstruction(input.instruction);
    }

    if (input.explanation !== undefined) {
      version.explanation = parseQuestionExplanation(input.explanation);
    }

    if (input.difficulty !== undefined) {
      version.difficulty = this.parseQuestionDifficulty(input.difficulty);
    }

    if (input.promptMediaJson !== undefined) {
      version.promptMediaJson = parseOptionalQuestionMediaJson(input.promptMediaJson);
      await validateQuestionMediaJsonAssets(version.promptMediaJson, this.mediaAssetService);
    }

    if (input.explanationMediaJson !== undefined) {
      version.explanationMediaJson = parseOptionalQuestionMediaJson(input.explanationMediaJson);
      await validateQuestionMediaJsonAssets(version.explanationMediaJson, this.mediaAssetService);
    }

    const savedVersion = await this.questionVersionRepository.save(version);

    if (savedVersion.questionType === QuestionType.TrueFalse) {
      await this.questionOptionService.ensureTrueFalseOptions(savedVersion.id);
    }

    await this.questionOptionService.recomputeSourceContentHash(
      this.questionVersionRepository.manager,
      savedVersion.id,
    );

    const refreshedVersion = await this.questionVersionRepository.findOne({
      where: { id: savedVersion.id },
    });

    return toQuestionVersionSnapshot(refreshedVersion ?? savedVersion);
  }

  async getAuthoringSnapshot(rawVersionId: string): Promise<QuestionAuthoringSnapshot> {
    const version = await this.getVersionById(rawVersionId);
    const options = await this.questionOptionService.listOptionsByVersion(rawVersionId);
    const correctOptionIds =
      await this.questionOptionService.getCorrectOptionIdsByVersion(rawVersionId);

    return {
      version,
      options,
      correctOptionIds,
    };
  }

  async cloneVersionToDraft(
    rawSourceVersionId: string,
    createdByUserId: string,
  ): Promise<QuestionAuthoringSnapshot> {
    try {
      return await this.dataSource.transaction(async (entityManager) =>
        this.cloneVersionToDraftTransaction(rawSourceVersionId, createdByUserId, entityManager),
      );
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw this.mapVersionUniqueConstraintError(error);
      }

      throw error;
    }
  }

  async cloneVersionToDraftTransaction(
    rawSourceVersionId: string,
    createdByUserId: string,
    entityManager: EntityManager,
  ): Promise<QuestionAuthoringSnapshot> {
    const sourceVersionId = this.parseVersionId(rawSourceVersionId);
    const sourceVersion = await entityManager.findOne(QuestionVersionEntity, {
      where: { id: sourceVersionId },
    });

    if (sourceVersion === null) {
      throw new QuestionVersionNotFoundError();
    }

    if (
      sourceVersion.status !== QuestionVersionStatus.Published &&
      sourceVersion.status !== QuestionVersionStatus.Archived
    ) {
      throw new QuestionVersionNotCloneableError();
    }

    if (
      sourceVersion.answerDefinitionJson !== null &&
      sourceVersion.answerDefinitionJson.trim().length > 0
    ) {
      throw new QuestionCloneSourceInvalidError();
    }

    const question = await entityManager.findOne(QuestionEntity, {
      where: { id: sourceVersion.questionId },
      lock: { mode: 'pessimistic_write' },
    });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    this.assertQuestionActive(question);

    const existingDraft = await entityManager.findOne(QuestionVersionEntity, {
      where: {
        questionId: question.id,
        status: QuestionVersionStatus.Draft,
      },
    });

    if (existingDraft !== null) {
      throw new QuestionDraftAlreadyExistsError();
    }

    const maxVersionNumber = await entityManager
      .createQueryBuilder(QuestionVersionEntity, 'version')
      .select('MAX(version.versionNumber)', 'maxVersionNumber')
      .where('version.questionId = :questionId', { questionId: question.id })
      .getRawOne<{ maxVersionNumber: number | null }>();

    const nextVersionNumber = (maxVersionNumber?.maxVersionNumber ?? 0) + 1;

    const draftVersion = entityManager.create(QuestionVersionEntity, {
      questionId: question.id,
      versionNumber: nextVersionNumber,
      status: QuestionVersionStatus.Draft,
      questionType: sourceVersion.questionType,
      prompt: sourceVersion.prompt,
      instruction: sourceVersion.instruction,
      explanation: sourceVersion.explanation,
      promptMediaJson: sourceVersion.promptMediaJson,
      explanationMediaJson: sourceVersion.explanationMediaJson,
      answerDefinitionJson: null,
      difficulty: sourceVersion.difficulty,
      sourceContentHash: null,
      createdByUserId: normalizeUuid(createdByUserId),
      publishedByUserId: null,
      publishedAt: null,
    });

    const savedDraftVersion = await entityManager.save(QuestionVersionEntity, draftVersion);

    const sourceOptions = await entityManager.find(QuestionOptionEntity, {
      where: { questionVersionId: sourceVersion.id },
      order: { sortOrder: 'ASC' },
    });

    const optionIdMap = new Map<string, string>();

    for (const sourceOption of sourceOptions) {
      const newOptionId = generateUuidV4();
      optionIdMap.set(normalizeUuid(sourceOption.id), newOptionId);

      const clonedOption = entityManager.create(QuestionOptionEntity, {
        id: newOptionId,
        questionVersionId: savedDraftVersion.id,
        code: sourceOption.code,
        text: sourceOption.text,
        mediaAssetId: sourceOption.mediaAssetId,
        sortOrder: sourceOption.sortOrder,
      });

      await entityManager.save(QuestionOptionEntity, clonedOption);
    }

    const sourceCorrectOptions = await entityManager.find(QuestionCorrectOptionEntity, {
      where: { questionVersionId: sourceVersion.id },
    });

    const correctOptionIds: string[] = [];

    for (const sourceCorrectOption of sourceCorrectOptions) {
      const remappedOptionId = optionIdMap.get(normalizeUuid(sourceCorrectOption.optionId));

      if (remappedOptionId === undefined) {
        throw new QuestionCloneSourceInvalidError();
      }

      const clonedCorrectOption = entityManager.create(QuestionCorrectOptionEntity, {
        questionVersionId: savedDraftVersion.id,
        optionId: remappedOptionId,
      });

      await entityManager.save(QuestionCorrectOptionEntity, clonedCorrectOption);
      correctOptionIds.push(remappedOptionId);
    }

    await this.questionOptionService.recomputeSourceContentHash(
      entityManager,
      savedDraftVersion.id,
    );

    const refreshedVersion = await entityManager.findOne(QuestionVersionEntity, {
      where: { id: savedDraftVersion.id },
    });
    const clonedOptions = await entityManager.find(QuestionOptionEntity, {
      where: { questionVersionId: savedDraftVersion.id },
      order: { sortOrder: 'ASC' },
    });

    return {
      version: toQuestionVersionSnapshot(refreshedVersion ?? savedDraftVersion),
      options: clonedOptions.map(toQuestionOptionSnapshot),
      correctOptionIds,
    };
  }

  async getLearnerQuestionProjection(rawVersionId: string): Promise<LearnerQuestionProjection> {
    return this.questionGradingService.getLearnerQuestionProjection(rawVersionId);
  }

  async getQuestionVersionPreview(rawVersionId: string): Promise<QuestionVersionPreview> {
    return this.questionGradingService.getQuestionVersionPreview(rawVersionId);
  }

  async getCurrentPublishedQuestionForSelection(
    rawQuestionId: string,
  ): Promise<PublishedQuestionSelectionSnapshot> {
    const question = await this.findQuestionEntity(rawQuestionId);

    if (question.status !== QuestionStatus.Active) {
      throw new QuestionInactiveError();
    }

    if (question.currentPublishedVersionId === null) {
      throw new QuestionNoPublishedVersionError();
    }

    const version = await this.questionVersionRepository.findOne({
      where: { id: question.currentPublishedVersionId },
    });

    if (version === null || version.status !== QuestionVersionStatus.Published) {
      throw new QuestionNoPublishedVersionError();
    }

    return {
      questionId: question.id,
      questionVersionId: version.id,
      questionType: version.questionType,
      sourceLocale: question.sourceLocale,
      sourceContentHash: version.sourceContentHash,
    };
  }

  async gradeAnswer(input: GradeAnswerInput): Promise<GradeAnswerResult> {
    return this.questionGradingService.gradeAnswer(input);
  }

  async getImmutableAssessmentSnapshot(rawVersionId: string): Promise<ImmutableAssessmentSnapshot> {
    return this.questionGradingService.getImmutableAssessmentSnapshot(rawVersionId);
  }

  async collectPublishValidationIssues(
    rawVersionId: string,
  ): Promise<QuestionPublishValidationIssue[]> {
    const version = await this.findVersionEntity(rawVersionId);
    const options = await this.questionOptionService.listOptionsByVersion(rawVersionId);
    const correctOptionIds =
      await this.questionOptionService.getCorrectOptionIdsByVersion(rawVersionId);

    const issues: QuestionPublishValidationIssue[] = [];

    if (version.status !== QuestionVersionStatus.Draft) {
      issues.push({
        code: 'DRAFT_ONLY',
        message: 'Only draft question versions can be published.',
        resourceId: version.id,
        path: 'status',
      });

      return issues;
    }

    if (version.prompt.trim().length === 0) {
      issues.push({
        code: 'PROMPT_REQUIRED',
        message: 'Question prompt is required before publish.',
        path: 'prompt',
      });
    }

    if (version.difficulty === null) {
      issues.push({
        code: 'DIFFICULTY_REQUIRED',
        message: 'Question difficulty is required before publish.',
        path: 'difficulty',
      });
    }

    if (version.answerDefinitionJson !== null && version.answerDefinitionJson.trim().length > 0) {
      issues.push({
        code: 'ANSWER_DEFINITION_NOT_ALLOWED',
        message: 'Answer definition JSON is not allowed for objective question types.',
        path: 'answerDefinitionJson',
      });
    }

    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      issues.push({
        code: 'INVALID_OPTION_COUNT',
        message: `Question must have between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`,
        path: 'options',
      });
    }

    const seenCodes = new Set<string>();

    for (const option of options) {
      if (option.text === null && option.mediaAssetId === null) {
        issues.push({
          code: 'OPTION_REPRESENTATION_REQUIRED',
          message: 'Each option must have text or media representation.',
          resourceId: option.id,
          path: `options/${option.id}`,
        });
      }

      if (option.code !== null) {
        if (seenCodes.has(option.code)) {
          issues.push({
            code: 'DUPLICATE_OPTION_CODE',
            message: `Duplicate option code "${option.code}".`,
            resourceId: option.id,
            path: `options/${option.id}/code`,
          });
        } else {
          seenCodes.add(option.code);
        }
      }

      if (option.mediaAssetId !== null) {
        const assetIssues = await this.collectOptionMediaValidationIssues(
          option.mediaAssetId,
          `options/${option.id}/mediaAssetId`,
        );
        issues.push(...assetIssues);
      }
    }

    const optionIdSet = new Set(options.map((option) => normalizeUuid(option.id)));

    if (correctOptionIds.length === 0) {
      issues.push({
        code: 'CORRECT_ANSWER_REQUIRED',
        message: 'At least one correct option must be defined before publish.',
        path: 'correctOptionIds',
      });
    }

    if (
      (version.questionType === QuestionType.SingleChoice ||
        version.questionType === QuestionType.TrueFalse) &&
      correctOptionIds.length > 1
    ) {
      issues.push({
        code: 'TOO_MANY_CORRECT_ANSWERS',
        message: 'Single-choice and true/false questions must have exactly one correct option.',
        path: 'correctOptionIds',
      });
    }

    for (const optionId of correctOptionIds) {
      if (!optionIdSet.has(normalizeUuid(optionId))) {
        issues.push({
          code: 'ANSWER_OPTION_NOT_FOUND',
          message: 'Correct option id does not belong to this version.',
          resourceId: optionId,
          path: 'correctOptionIds',
        });
      }
    }

    const promptMediaIssues = await collectQuestionMediaJsonValidationIssues(
      version.promptMediaJson,
      this.mediaAssetService,
      'promptMediaJson',
    );
    issues.push(...toPublishValidationIssues(promptMediaIssues));

    const explanationMediaIssues = await collectQuestionMediaJsonValidationIssues(
      version.explanationMediaJson,
      this.mediaAssetService,
      'explanationMediaJson',
    );
    issues.push(...toPublishValidationIssues(explanationMediaIssues));

    return issues;
  }

  async publishDraftVersion(
    rawVersionId: string,
    publishedByUserId: string,
  ): Promise<QuestionVersionSnapshot> {
    const issues = await this.collectPublishValidationIssues(rawVersionId);

    if (issues.length > 0) {
      throw new QuestionPublishValidationError(issues);
    }

    return this.dataSource.transaction(async (entityManager) =>
      this.publishDraftVersionTransaction(rawVersionId, publishedByUserId, entityManager),
    );
  }

  async publishDraftVersionTransaction(
    rawVersionId: string,
    publishedByUserId: string,
    entityManager: EntityManager,
  ): Promise<QuestionVersionSnapshot> {
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
      lock: { mode: 'pessimistic_write' },
    });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    this.assertQuestionActive(question);

    if (question.currentPublishedVersionId !== null) {
      const previousPublishedVersion = await entityManager.findOne(QuestionVersionEntity, {
        where: { id: question.currentPublishedVersionId },
      });

      if (previousPublishedVersion !== null) {
        previousPublishedVersion.status = QuestionVersionStatus.Archived;
        await entityManager.save(QuestionVersionEntity, previousPublishedVersion);
      }
    }

    const sourceContentHash = await this.questionOptionService.recomputeSourceContentHash(
      entityManager,
      version.id,
    );

    const publishedAt = new Date();
    version.status = QuestionVersionStatus.Published;
    version.publishedAt = publishedAt;
    version.publishedByUserId = normalizeUuid(publishedByUserId);
    version.sourceContentHash = sourceContentHash;

    question.currentPublishedVersionId = version.id;

    await entityManager.save(QuestionVersionEntity, version);
    await entityManager.save(QuestionEntity, question);

    return toQuestionVersionSnapshot(version);
  }

  private async collectOptionMediaValidationIssues(
    assetId: string,
    path: string,
  ): Promise<QuestionPublishValidationIssue[]> {
    try {
      await this.mediaAssetService.assertAssetCategory(assetId, MediaCategory.Image);
      return [];
    } catch (error: unknown) {
      if (error instanceof MediaAssetNotFoundError) {
        return [
          {
            code: 'ASSET_NOT_FOUND',
            message: 'Referenced media asset was not found.',
            resourceId: assetId,
            path,
          },
        ];
      }

      if (error instanceof MediaAssetNotReadyError) {
        return [
          {
            code: 'ASSET_NOT_READY',
            message: 'Referenced media asset is not ready.',
            resourceId: assetId,
            path,
          },
        ];
      }

      if (error instanceof MediaAssetCategoryMismatchError) {
        return [
          {
            code: 'ASSET_CATEGORY_MISMATCH',
            message: 'Referenced media asset category does not match the expected image type.',
            resourceId: assetId,
            path,
          },
        ];
      }

      throw error;
    }
  }

  private applyQuestionListFilters(
    queryBuilder: SelectQueryBuilder<QuestionEntity>,
    input: ListQuestionsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('question.status = :status', { status: input.status });
    }

    if (input.sourceLocale !== undefined) {
      queryBuilder.andWhere('question.sourceLocale = :sourceLocale', {
        sourceLocale: this.parseQuestionSourceLocale(input.sourceLocale),
      });
    }

    if (input.search !== undefined && input.search.trim().length > 0) {
      const searchPattern = `%${this.escapeLikePattern(input.search.trim())}%`;
      queryBuilder.andWhere(
        new Brackets((expressionBuilder) => {
          expressionBuilder.where("question.code LIKE :searchPattern ESCAPE '\\'");
        }),
        { searchPattern },
      );
    }
  }

  private resolveQuestionSortColumn(
    sortBy: ListQuestionsInput['sortBy'],
  ): 'question.code' | 'question.status' | 'question.sourceLocale' | 'question.createdAt' {
    switch (sortBy) {
      case 'code':
        return 'question.code';
      case 'status':
        return 'question.status';
      case 'sourceLocale':
        return 'question.sourceLocale';
      case 'createdAt':
      default:
        return 'question.createdAt';
    }
  }

  private async assertSourceLocaleMutable(
    questionId: string,
    currentPublishedVersionId: string | null,
  ): Promise<void> {
    if (currentPublishedVersionId !== null) {
      throw new QuestionSourceLocaleImmutableError();
    }

    const publishedOrArchivedCount = await this.questionVersionRepository.count({
      where: [
        { questionId, status: QuestionVersionStatus.Published },
        { questionId, status: QuestionVersionStatus.Archived },
      ],
    });

    if (publishedOrArchivedCount > 0) {
      throw new QuestionSourceLocaleImmutableError();
    }
  }

  private assertQuestionActive(question: QuestionEntity): void {
    if (question.status !== QuestionStatus.Active) {
      throw new QuestionInactiveError();
    }
  }

  private mapVersionUniqueConstraintError(error: unknown): Error {
    if (!(error instanceof QueryFailedError)) {
      return new QuestionVersionNumberConflictError();
    }

    const message = String(error.message);

    if (message.includes('UQ_question_versions_question_id_draft')) {
      return new QuestionDraftAlreadyExistsError();
    }

    return new QuestionVersionNumberConflictError();
  }

  private async findQuestionEntity(rawQuestionId: string): Promise<QuestionEntity> {
    const questionId = this.parseQuestionId(rawQuestionId);
    const question = await this.questionRepository.findOne({ where: { id: questionId } });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    return question;
  }

  private async findVersionEntity(rawVersionId: string): Promise<QuestionVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.questionVersionRepository.findOne({ where: { id: versionId } });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }

    return version;
  }

  private parseQuestionId(rawQuestionId: string): string {
    if (!isUuidV4(rawQuestionId)) {
      throw new InvalidQuestionIdError();
    }

    return normalizeUuid(rawQuestionId);
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidQuestionVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }

  private parseQuestionSourceLocale(rawLocale: string): string {
    try {
      return parseSourceLocale(rawLocale);
    } catch (error: unknown) {
      if (error instanceof InvalidCurriculumSourceLocaleError) {
        throw new InvalidQuestionSourceLocaleError();
      }

      throw error;
    }
  }

  private parseQuestionType(rawType: string): QuestionType {
    if (!Object.values(QuestionType).includes(rawType as QuestionType)) {
      throw new InvalidQuestionTypeError();
    }

    return rawType as QuestionType;
  }

  private parseQuestionDifficulty(
    rawDifficulty: QuestionDifficulty | null | undefined,
  ): QuestionDifficulty | null {
    if (rawDifficulty === undefined || rawDifficulty === null) {
      return null;
    }

    if (!Object.values(QuestionDifficulty).includes(rawDifficulty)) {
      throw new InvalidQuestionDifficultyError();
    }

    return rawDifficulty;
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[%_[\\]/g, '\\$&');
  }
}
