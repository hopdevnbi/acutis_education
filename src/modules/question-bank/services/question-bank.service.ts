import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { InvalidCurriculumSourceLocaleError } from '../../curriculum/errors/curriculum.errors';
import { parseSourceLocale } from '../../curriculum/utils/curriculum-source-locale.util';
import { ParishService } from '../../parish/services/parish.service';
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
  QuestionCodeAlreadyExistsError,
  QuestionDraftAlreadyExistsError,
  QuestionInactiveError,
  QuestionNotFoundError,
  QuestionSourceLocaleImmutableError,
  QuestionUpdateRequiresFieldsError,
  QuestionVersionNotDraftError,
  QuestionVersionNotFoundError,
  QuestionVersionNumberConflictError,
  InvalidQuestionIdError,
  InvalidQuestionVersionIdError,
} from '../errors/question-bank.errors';
import type {
  CreateQuestionInput,
  CreateQuestionResult,
  CreateQuestionVersionInput,
  ListQuestionVersionsInput,
  ListQuestionsInput,
  ListQuestionsResult,
  QuestionSnapshot,
  QuestionVersionSnapshot,
  UpdateQuestionInput,
  UpdateQuestionVersionInput,
} from '../interfaces/question-bank.interface';
import { toQuestionSnapshot, toQuestionVersionSnapshot } from '../mappers/question-bank.mapper';
import { parseQuestionCode } from '../utils/question-code.util';
import {
  parseQuestionExplanation,
  parseQuestionInstruction,
  parseQuestionPrompt,
} from '../utils/question-text.util';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(QuestionVersionEntity)
    private readonly questionVersionRepository: Repository<QuestionVersionEntity>,
    private readonly parishService: ParishService,
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

        return {
          question: toQuestionSnapshot(savedQuestion),
          initialVersion: toQuestionVersionSnapshot(savedVersion),
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

        return toQuestionVersionSnapshot(savedVersion);
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
      version.questionType = this.parseQuestionType(input.questionType);
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
      version.promptMediaJson = input.promptMediaJson;
    }

    if (input.explanationMediaJson !== undefined) {
      version.explanationMediaJson = input.explanationMediaJson;
    }

    const savedVersion = await this.questionVersionRepository.save(version);

    return toQuestionVersionSnapshot(savedVersion);
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
