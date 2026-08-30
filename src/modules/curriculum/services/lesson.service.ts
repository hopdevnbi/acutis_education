import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { generateUuidV4, isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
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
} from '../errors/curriculum.errors';
import {
  InvalidCanonicalLessonKeyMutationError,
  InvalidLessonIdError,
  InvalidLessonReorderError,
  LessonCodeAlreadyExistsError,
  LessonNotFoundError,
  LessonVersionMismatchError,
} from '../errors/lesson.errors';
import { InvalidTopicIdError, TopicNotFoundError } from '../errors/topic.errors';
import type {
  CreateLessonInput,
  LessonCurriculumContext,
  LessonSnapshot,
  ReorderLessonsInput,
  UpdateLessonInput,
} from '../interfaces/lesson.interface';
import { toLessonSnapshot } from '../mappers/curriculum.mapper';
import { parseLessonCode } from '../utils/lesson-code.util';
import {
  parseEstimatedDurationMinutes,
  parseLessonSummary,
  parseLessonTitle,
} from '../utils/lesson-title.util';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(LessonEntity)
    private readonly lessonRepository: Repository<LessonEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(CurriculumVersionEntity)
    private readonly curriculumVersionRepository: Repository<CurriculumVersionEntity>,
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepository: Repository<CurriculumEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createLesson(rawTopicId: string, input: CreateLessonInput): Promise<LessonSnapshot> {
    const topic = await this.findTopicEntity(rawTopicId);
    const version = await this.findVersionEntity(topic.curriculumVersionId);
    await this.assertDraftVersionContext(version);

    const sortOrder =
      input.sortOrder !== undefined
        ? input.sortOrder
        : await this.resolveNextLessonSortOrder(topic.id);

    const lesson = this.lessonRepository.create({
      curriculumVersionId: topic.curriculumVersionId,
      topicId: topic.id,
      canonicalLessonKey: generateUuidV4(),
      code: parseLessonCode(input.code),
      title: parseLessonTitle(input.title),
      summary: parseLessonSummary(input.summary),
      estimatedDurationMinutes: parseEstimatedDurationMinutes(input.estimatedDurationMinutes),
      sortOrder,
    });

    try {
      const savedLesson = await this.lessonRepository.save(lesson);

      return toLessonSnapshot(savedLesson);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error) && lesson.code !== null) {
        throw new LessonCodeAlreadyExistsError(lesson.code);
      }

      throw error;
    }
  }

  async listLessonsByTopic(rawTopicId: string): Promise<LessonSnapshot[]> {
    const topicId = this.parseTopicId(rawTopicId);
    await this.findTopicEntity(topicId);

    const lessons = await this.lessonRepository.find({
      where: { topicId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return lessons.map(toLessonSnapshot);
  }

  async getLessonById(rawLessonId: string): Promise<LessonSnapshot> {
    const lesson = await this.findLessonEntity(rawLessonId);

    return toLessonSnapshot(lesson);
  }

  async updateLesson(rawLessonId: string, input: UpdateLessonInput): Promise<LessonSnapshot> {
    if (this.hasForbiddenCanonicalLessonKeyMutation(input)) {
      throw new InvalidCanonicalLessonKeyMutationError();
    }

    const lesson = await this.findLessonEntity(rawLessonId);
    const topic = await this.findTopicEntity(lesson.topicId);
    this.assertLessonTopicVersionConsistency(lesson, topic);

    const version = await this.findVersionEntity(lesson.curriculumVersionId);
    await this.assertDraftVersionContext(version);

    const originalCanonicalLessonKey = lesson.canonicalLessonKey;

    if (input.code !== undefined) {
      lesson.code = parseLessonCode(input.code);
    }

    if (input.title !== undefined) {
      lesson.title = parseLessonTitle(input.title);
    }

    if (input.summary !== undefined) {
      lesson.summary = parseLessonSummary(input.summary);
    }

    if (input.estimatedDurationMinutes !== undefined) {
      lesson.estimatedDurationMinutes = parseEstimatedDurationMinutes(
        input.estimatedDurationMinutes,
      );
    }

    if (normalizeUuid(lesson.canonicalLessonKey) !== normalizeUuid(originalCanonicalLessonKey)) {
      throw new InvalidCanonicalLessonKeyMutationError();
    }

    try {
      const savedLesson = await this.lessonRepository.save(lesson);

      return toLessonSnapshot(savedLesson);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error) && lesson.code !== null) {
        throw new LessonCodeAlreadyExistsError(lesson.code);
      }

      throw error;
    }
  }

  async reorderLessons(rawTopicId: string, input: ReorderLessonsInput): Promise<LessonSnapshot[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const topic = await this.findTopicEntity(rawTopicId);
      const version = await this.findVersionEntity(topic.curriculumVersionId);
      await this.assertDraftVersionContext(version);

      const lessons = await entityManager.find(LessonEntity, {
        where: { topicId: topic.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      if (lessons.length !== input.lessonIds.length) {
        throw new InvalidLessonReorderError();
      }

      const lessonIdSet = new Set(lessons.map((lesson) => normalizeUuid(lesson.id)));

      for (const lessonId of input.lessonIds) {
        if (!lessonIdSet.has(normalizeUuid(lessonId))) {
          throw new InvalidLessonReorderError();
        }
      }

      const lessonById = new Map(lessons.map((lesson) => [normalizeUuid(lesson.id), lesson]));

      for (const [index, lessonId] of input.lessonIds.entries()) {
        const lesson = lessonById.get(normalizeUuid(lessonId));

        if (lesson === undefined) {
          throw new InvalidLessonReorderError();
        }

        this.assertLessonTopicVersionConsistency(lesson, topic);
        lesson.sortOrder = index;
      }

      const savedLessons = await entityManager.save(LessonEntity, lessons);

      return savedLessons
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(toLessonSnapshot);
    });
  }

  async deleteLessonStructure(rawLessonId: string): Promise<void> {
    await this.dataSource.transaction(async (entityManager) => {
      await this.deleteLessonStructureTransaction(rawLessonId, entityManager);
    });
  }

  async deleteLessonStructureTransaction(
    rawLessonId: string,
    entityManager: EntityManager,
  ): Promise<void> {
    const lesson = await this.findLessonEntity(rawLessonId);
    const topic = await this.findTopicEntity(lesson.topicId);
    this.assertLessonTopicVersionConsistency(lesson, topic);

    const version = await this.findVersionEntity(lesson.curriculumVersionId);
    await this.assertDraftVersionContext(version);

    await entityManager.delete(LessonEntity, { id: lesson.id });

    const remainingLessons = await entityManager.find(LessonEntity, {
      where: { topicId: topic.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    for (const [index, remainingLesson] of remainingLessons.entries()) {
      remainingLesson.sortOrder = index;
    }

    if (remainingLessons.length > 0) {
      await entityManager.save(LessonEntity, remainingLessons);
    }
  }

  async getLessonParishId(rawLessonId: string): Promise<string> {
    const lesson = await this.findLessonEntity(rawLessonId);
    const version = await this.findVersionEntity(lesson.curriculumVersionId);
    const curriculum = await this.findCurriculumEntity(version.curriculumId);

    return normalizeUuid(curriculum.parishId);
  }

  async getLessonCurriculumContext(rawLessonId: string): Promise<LessonCurriculumContext> {
    const lesson = await this.findLessonEntity(rawLessonId);
    const topic = await this.findTopicEntity(lesson.topicId);
    this.assertLessonTopicVersionConsistency(lesson, topic);

    const version = await this.findVersionEntity(lesson.curriculumVersionId);
    const curriculum = await this.findCurriculumEntity(version.curriculumId);

    return {
      lessonId: normalizeUuid(lesson.id),
      topicId: normalizeUuid(lesson.topicId),
      curriculumVersionId: normalizeUuid(lesson.curriculumVersionId),
      curriculumId: normalizeUuid(curriculum.id),
      parishId: normalizeUuid(curriculum.parishId),
      canonicalLessonKey: normalizeUuid(lesson.canonicalLessonKey),
      versionStatus: version.status,
      curriculumStatus: curriculum.status,
    };
  }

  private hasForbiddenCanonicalLessonKeyMutation(input: UpdateLessonInput): boolean {
    return 'canonicalLessonKey' in input;
  }

  private assertLessonTopicVersionConsistency(lesson: LessonEntity, topic: TopicEntity): void {
    if (normalizeUuid(lesson.curriculumVersionId) !== normalizeUuid(topic.curriculumVersionId)) {
      throw new LessonVersionMismatchError();
    }
  }

  private async resolveNextLessonSortOrder(topicId: string): Promise<number> {
    const maxSortOrder = await this.lessonRepository
      .createQueryBuilder('lesson')
      .select('MAX(lesson.sortOrder)', 'maxSortOrder')
      .where('lesson.topicId = :topicId', { topicId })
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
    const version = await this.curriculumVersionRepository.findOne({
      where: { id: normalizeUuid(rawVersionId) },
    });

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

  private async findLessonEntity(rawLessonId: string): Promise<LessonEntity> {
    const lessonId = this.parseLessonId(rawLessonId);
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });

    if (lesson === null) {
      throw new LessonNotFoundError();
    }

    return lesson;
  }

  private parseTopicId(rawTopicId: string): string {
    if (!isUuidV4(rawTopicId)) {
      throw new InvalidTopicIdError();
    }

    return normalizeUuid(rawTopicId);
  }

  private parseLessonId(rawLessonId: string): string {
    if (!isUuidV4(rawLessonId)) {
      throw new InvalidLessonIdError();
    }

    return normalizeUuid(rawLessonId);
  }
}
