import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import { CurriculumEntity } from '../entities/curriculum.entity';
import { LessonEntity } from '../entities/lesson.entity';
import { TopicEntity } from '../entities/topic.entity';
import { CurriculumStatus } from '../enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import {
  CurriculumInactiveError,
  CurriculumNotFoundError,
  CurriculumVersionNotDraftError,
  CurriculumVersionNotFoundError,
  InvalidCurriculumVersionIdError,
} from '../errors/curriculum.errors';
import {
  InvalidTopicIdError,
  InvalidTopicReorderError,
  TopicCodeAlreadyExistsError,
  TopicNotEmptyError,
  TopicNotFoundError,
} from '../errors/topic.errors';
import type {
  CreateTopicInput,
  ReorderTopicsInput,
  TopicSnapshot,
  UpdateTopicInput,
} from '../interfaces/topic.interface';
import { toTopicSnapshot } from '../mappers/curriculum.mapper';
import { parseTopicCode } from '../utils/topic-code.util';
import { parseTopicDescription, parseTopicTitle } from '../utils/topic-title.util';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepository: Repository<LessonEntity>,
    @InjectRepository(CurriculumVersionEntity)
    private readonly curriculumVersionRepository: Repository<CurriculumVersionEntity>,
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepository: Repository<CurriculumEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createTopic(rawVersionId: string, input: CreateTopicInput): Promise<TopicSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);
    await this.assertDraftVersionContext(version);

    const sortOrder =
      input.sortOrder !== undefined
        ? input.sortOrder
        : await this.resolveNextTopicSortOrder(version.id);

    const topic = this.topicRepository.create({
      curriculumVersionId: version.id,
      code: parseTopicCode(input.code),
      title: parseTopicTitle(input.title),
      description: parseTopicDescription(input.description),
      sortOrder,
    });

    try {
      const savedTopic = await this.topicRepository.save(topic);

      return toTopicSnapshot(savedTopic);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error) && topic.code !== null) {
        throw new TopicCodeAlreadyExistsError(topic.code);
      }

      throw error;
    }
  }

  async listTopicsByVersion(rawVersionId: string): Promise<TopicSnapshot[]> {
    const versionId = this.parseVersionId(rawVersionId);
    await this.findVersionEntity(versionId);

    const topics = await this.topicRepository.find({
      where: { curriculumVersionId: versionId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return topics.map(toTopicSnapshot);
  }

  async getTopicById(rawTopicId: string): Promise<TopicSnapshot> {
    const topic = await this.findTopicEntity(rawTopicId);

    return toTopicSnapshot(topic);
  }

  async updateTopic(rawTopicId: string, input: UpdateTopicInput): Promise<TopicSnapshot> {
    const topic = await this.findTopicEntity(rawTopicId);
    const version = await this.findVersionEntity(topic.curriculumVersionId);
    await this.assertDraftVersionContext(version);

    if (input.code !== undefined) {
      topic.code = parseTopicCode(input.code);
    }

    if (input.title !== undefined) {
      topic.title = parseTopicTitle(input.title);
    }

    if (input.description !== undefined) {
      topic.description = parseTopicDescription(input.description);
    }

    try {
      const savedTopic = await this.topicRepository.save(topic);

      return toTopicSnapshot(savedTopic);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error) && topic.code !== null) {
        throw new TopicCodeAlreadyExistsError(topic.code);
      }

      throw error;
    }
  }

  async reorderTopics(rawVersionId: string, input: ReorderTopicsInput): Promise<TopicSnapshot[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const version = await this.findVersionEntity(rawVersionId);
      await this.assertDraftVersionContext(version);

      const topics = await entityManager.find(TopicEntity, {
        where: { curriculumVersionId: version.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      if (topics.length !== input.topicIds.length) {
        throw new InvalidTopicReorderError();
      }

      const topicIdSet = new Set(topics.map((topic) => normalizeUuid(topic.id)));

      for (const topicId of input.topicIds) {
        if (!topicIdSet.has(normalizeUuid(topicId))) {
          throw new InvalidTopicReorderError();
        }
      }

      const topicById = new Map(topics.map((topic) => [normalizeUuid(topic.id), topic]));

      for (const [index, topicId] of input.topicIds.entries()) {
        const topic = topicById.get(normalizeUuid(topicId));

        if (topic === undefined) {
          throw new InvalidTopicReorderError();
        }

        topic.sortOrder = index;
      }

      const savedTopics = await entityManager.save(TopicEntity, topics);

      return savedTopics
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(toTopicSnapshot);
    });
  }

  async deleteTopic(rawTopicId: string): Promise<void> {
    const topic = await this.findTopicEntity(rawTopicId);
    const version = await this.findVersionEntity(topic.curriculumVersionId);
    await this.assertDraftVersionContext(version);

    const lessonCount = await this.lessonRepository.count({
      where: { topicId: topic.id },
    });

    if (lessonCount > 0) {
      throw new TopicNotEmptyError();
    }

    await this.dataSource.transaction(async (entityManager) => {
      await entityManager.delete(TopicEntity, { id: topic.id });

      const remainingTopics = await entityManager.find(TopicEntity, {
        where: { curriculumVersionId: version.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      for (const [index, remainingTopic] of remainingTopics.entries()) {
        remainingTopic.sortOrder = index;
      }

      if (remainingTopics.length > 0) {
        await entityManager.save(TopicEntity, remainingTopics);
      }
    });
  }

  async getTopicParishId(rawTopicId: string): Promise<string> {
    const topic = await this.findTopicEntity(rawTopicId);
    const version = await this.findVersionEntity(topic.curriculumVersionId);
    const curriculum = await this.findCurriculumEntity(version.curriculumId);

    return normalizeUuid(curriculum.parishId);
  }

  private async resolveNextTopicSortOrder(versionId: string): Promise<number> {
    const maxSortOrder = await this.topicRepository
      .createQueryBuilder('topic')
      .select('MAX(topic.sortOrder)', 'maxSortOrder')
      .where('topic.curriculumVersionId = :versionId', { versionId })
      .getRawOne<{ maxSortOrder: number | null }>();

    return (maxSortOrder?.maxSortOrder ?? -1) + 1;
  }

  private async assertDraftVersionContext(version: CurriculumVersionEntity): Promise<void> {
    if (version.status !== CurriculumVersionStatus.Draft) {
      throw new CurriculumVersionNotDraftError();
    }

    const curriculum = await this.findCurriculumEntity(version.curriculumId);

    if (curriculum.status !== CurriculumStatus.Active) {
      throw new CurriculumInactiveError();
    }
  }

  private async findCurriculumEntity(curriculumId: string): Promise<CurriculumEntity> {
    const curriculum = await this.curriculumRepository.findOne({ where: { id: curriculumId } });

    if (curriculum === null) {
      throw new CurriculumNotFoundError();
    }

    return curriculum;
  }

  private async findVersionEntity(rawVersionId: string): Promise<CurriculumVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.curriculumVersionRepository.findOne({ where: { id: versionId } });

    if (version === null) {
      throw new CurriculumVersionNotFoundError();
    }

    return version;
  }

  private async findTopicEntity(rawTopicId: string): Promise<TopicEntity> {
    const topicId = this.parseTopicId(rawTopicId);
    const topic = await this.topicRepository.findOne({ where: { id: topicId } });

    if (topic === null) {
      throw new TopicNotFoundError();
    }

    return topic;
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidCurriculumVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }

  private parseTopicId(rawTopicId: string): string {
    if (!isUuidV4(rawTopicId)) {
      throw new InvalidTopicIdError();
    }

    return normalizeUuid(rawTopicId);
  }
}
