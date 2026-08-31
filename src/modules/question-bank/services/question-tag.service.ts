import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { ParishService } from '../../parish/services/parish.service';
import { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionTagStatus } from '../enums/question-tag-status.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import {
  InvalidQuestionIdError,
  InvalidQuestionTagIdError,
  QuestionInactiveError,
  QuestionNotFoundError,
  QuestionTagCodeAlreadyExistsError,
  QuestionTagInactiveError,
  QuestionTagLinkAlreadyExistsError,
  QuestionTagLinkNotFoundError,
  QuestionTagNotFoundError,
  QuestionTagParishMismatchError,
  QuestionUpdateRequiresFieldsError,
} from '../errors/question-bank.errors';
import type {
  CreateQuestionTagInput,
  ListQuestionTagsInput,
  ListQuestionTagsResult,
  QuestionTagLinkSnapshot,
  QuestionTagSnapshot,
  UpdateQuestionTagInput,
} from '../interfaces/question-bank.interface';
import { toQuestionTagLinkSnapshot, toQuestionTagSnapshot } from '../mappers/question-bank.mapper';
import { parseQuestionTagCode } from '../utils/question-tag-code.util';
import { parseQuestionTagName } from '../utils/question-text.util';

@Injectable()
export class QuestionTagService {
  constructor(
    @InjectRepository(QuestionTagEntity)
    private readonly questionTagRepository: Repository<QuestionTagEntity>,
    @InjectRepository(QuestionTagLinkEntity)
    private readonly questionTagLinkRepository: Repository<QuestionTagLinkEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly parishService: ParishService,
  ) {}

  async createTag(
    rawParishId: string,
    input: CreateQuestionTagInput,
  ): Promise<QuestionTagSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);

    const tag = this.questionTagRepository.create({
      parishId: parishSnapshot.id,
      code: parseQuestionTagCode(input.code),
      name: parseQuestionTagName(input.name),
      status: QuestionTagStatus.Active,
    });

    try {
      const savedTag = await this.questionTagRepository.save(tag);

      return toQuestionTagSnapshot(savedTag);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new QuestionTagCodeAlreadyExistsError(tag.code);
      }

      throw error;
    }
  }

  async listTagsByParish(
    rawParishId: string,
    input: ListQuestionTagsInput,
  ): Promise<ListQuestionTagsResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    const queryBuilder = this.questionTagRepository
      .createQueryBuilder('tag')
      .where('tag.parishId = :parishId', { parishId: parishSnapshot.id });

    this.applyTagListFilters(queryBuilder, input);

    const sortColumn = this.resolveTagSortColumn(input.sortBy);
    queryBuilder.orderBy(sortColumn, input.sort);

    const total = await queryBuilder.getCount();
    const entities = await queryBuilder
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getMany();

    return {
      items: entities.map(toQuestionTagSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async getTagById(rawTagId: string): Promise<QuestionTagSnapshot> {
    const tag = await this.findTagEntity(rawTagId);

    return toQuestionTagSnapshot(tag);
  }

  async updateTag(rawTagId: string, input: UpdateQuestionTagInput): Promise<QuestionTagSnapshot> {
    if (input.code === undefined && input.name === undefined) {
      throw new QuestionUpdateRequiresFieldsError();
    }

    const tag = await this.findTagEntity(rawTagId);
    this.assertTagActive(tag);

    if (input.code !== undefined) {
      tag.code = parseQuestionTagCode(input.code);
    }

    if (input.name !== undefined) {
      tag.name = parseQuestionTagName(input.name);
    }

    try {
      const savedTag = await this.questionTagRepository.save(tag);

      return toQuestionTagSnapshot(savedTag);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new QuestionTagCodeAlreadyExistsError(tag.code);
      }

      throw error;
    }
  }

  async updateTagStatus(rawTagId: string, status: QuestionTagStatus): Promise<QuestionTagSnapshot> {
    const tag = await this.findTagEntity(rawTagId);
    tag.status = status;

    const savedTag = await this.questionTagRepository.save(tag);

    return toQuestionTagSnapshot(savedTag);
  }

  async linkTag(rawQuestionId: string, rawTagId: string): Promise<QuestionTagLinkSnapshot> {
    const question = await this.findQuestionEntity(rawQuestionId);
    this.assertQuestionActive(question);

    const tag = await this.findTagEntity(rawTagId);
    this.assertTagActive(tag);

    if (normalizeUuid(tag.parishId) !== normalizeUuid(question.parishId)) {
      throw new QuestionTagParishMismatchError();
    }

    const existingLink = await this.questionTagLinkRepository.findOne({
      where: {
        questionId: question.id,
        tagId: tag.id,
      },
    });

    if (existingLink !== null) {
      throw new QuestionTagLinkAlreadyExistsError();
    }

    const link = this.questionTagLinkRepository.create({
      questionId: question.id,
      tagId: tag.id,
    });

    try {
      const savedLink = await this.questionTagLinkRepository.save(link);

      return toQuestionTagLinkSnapshot(savedLink);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new QuestionTagLinkAlreadyExistsError();
      }

      throw error;
    }
  }

  async unlinkTag(rawQuestionId: string, rawTagId: string): Promise<void> {
    const questionId = this.parseQuestionId(rawQuestionId);
    const tagId = this.parseTagId(rawTagId);

    await this.findQuestionEntity(questionId);
    await this.findTagEntity(tagId);

    const result = await this.questionTagLinkRepository.delete({
      questionId,
      tagId,
    });

    if (result.affected === 0) {
      throw new QuestionTagLinkNotFoundError();
    }
  }

  async listTagsByQuestion(rawQuestionId: string): Promise<QuestionTagSnapshot[]> {
    const questionId = this.parseQuestionId(rawQuestionId);
    await this.findQuestionEntity(questionId);

    const tags = await this.questionTagRepository
      .createQueryBuilder('tag')
      .innerJoin(QuestionTagLinkEntity, 'link', 'link.tagId = tag.id')
      .where('link.questionId = :questionId', { questionId })
      .orderBy('tag.code', 'ASC')
      .addOrderBy('tag.createdAt', 'ASC')
      .getMany();

    return tags.map(toQuestionTagSnapshot);
  }

  async listTagLinksByQuestion(rawQuestionId: string): Promise<QuestionTagLinkSnapshot[]> {
    const questionId = this.parseQuestionId(rawQuestionId);
    await this.findQuestionEntity(questionId);

    const links = await this.questionTagLinkRepository.find({
      where: { questionId },
    });

    return links.map(toQuestionTagLinkSnapshot);
  }

  private applyTagListFilters(
    queryBuilder: SelectQueryBuilder<QuestionTagEntity>,
    input: ListQuestionTagsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('tag.status = :status', { status: input.status });
    }

    if (input.search !== undefined && input.search.trim().length > 0) {
      const searchPattern = `%${this.escapeLikePattern(input.search.trim())}%`;
      queryBuilder.andWhere(
        new Brackets((expressionBuilder) => {
          expressionBuilder
            .where("tag.code LIKE :searchPattern ESCAPE '\\'")
            .orWhere("tag.name LIKE :searchPattern ESCAPE '\\'");
        }),
        { searchPattern },
      );
    }
  }

  private resolveTagSortColumn(
    sortBy: ListQuestionTagsInput['sortBy'],
  ): 'tag.code' | 'tag.name' | 'tag.status' | 'tag.createdAt' {
    switch (sortBy) {
      case 'code':
        return 'tag.code';
      case 'name':
        return 'tag.name';
      case 'status':
        return 'tag.status';
      case 'createdAt':
      default:
        return 'tag.createdAt';
    }
  }

  private assertTagActive(tag: QuestionTagEntity): void {
    if (tag.status !== QuestionTagStatus.Active) {
      throw new QuestionTagInactiveError();
    }
  }

  private assertQuestionActive(question: QuestionEntity): void {
    if (question.status !== QuestionStatus.Active) {
      throw new QuestionInactiveError();
    }
  }

  private async findTagEntity(rawTagId: string): Promise<QuestionTagEntity> {
    const tagId = this.parseTagId(rawTagId);
    const tag = await this.questionTagRepository.findOne({ where: { id: tagId } });

    if (tag === null) {
      throw new QuestionTagNotFoundError();
    }

    return tag;
  }

  private async findQuestionEntity(rawQuestionId: string): Promise<QuestionEntity> {
    const questionId = this.parseQuestionId(rawQuestionId);
    const question = await this.questionRepository.findOne({ where: { id: questionId } });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    return question;
  }

  private parseQuestionId(rawQuestionId: string): string {
    if (!isUuidV4(rawQuestionId)) {
      throw new InvalidQuestionIdError();
    }

    return normalizeUuid(rawQuestionId);
  }

  private parseTagId(rawTagId: string): string {
    if (!isUuidV4(rawTagId)) {
      throw new InvalidQuestionTagIdError();
    }

    return normalizeUuid(rawTagId);
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[%_[\\]/g, '\\$&');
  }
}
