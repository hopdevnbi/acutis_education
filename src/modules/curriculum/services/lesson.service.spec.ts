import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import * as uuidUtil from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import { CurriculumEntity } from '../entities/curriculum.entity';
import { LessonEntity } from '../entities/lesson.entity';
import { TopicEntity } from '../entities/topic.entity';
import { CurriculumStatus } from '../enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import { CurriculumVersionNotDraftError } from '../errors/curriculum.errors';
import {
  InvalidCanonicalLessonKeyMutationError,
  InvalidLessonCodeError,
  InvalidLessonReorderError,
  LessonCodeAlreadyExistsError,
} from '../errors/lesson.errors';
import { LessonService } from './lesson.service';

jest.mock('../../academic-structure/utils/unique-constraint.util', () => ({
  isUniqueConstraintViolation: jest.fn(),
}));

function mockDataSourceTransaction(
  dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>,
  entityManager: EntityManager,
): void {
  dataSource.transaction.mockImplementation(async (...args: unknown[]) => {
    const runInTransaction = args.find(
      (arg): arg is (manager: EntityManager) => Promise<unknown> => typeof arg === 'function',
    );

    if (runInTransaction === undefined) {
      throw new Error('Transaction callback missing');
    }

    return runInTransaction(entityManager);
  });
}

describe('LessonService', () => {
  let lessonService: LessonService;
  let lessonRepository: jest.Mocked<
    Pick<Repository<LessonEntity>, 'create' | 'save' | 'findOne' | 'find' | 'createQueryBuilder'>
  >;
  let topicRepository: jest.Mocked<Pick<Repository<TopicEntity>, 'findOne'>>;
  let curriculumVersionRepository: jest.Mocked<
    Pick<Repository<CurriculumVersionEntity>, 'findOne'>
  >;
  let curriculumRepository: jest.Mocked<Pick<Repository<CurriculumEntity>, 'findOne'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const curriculumId = '22222222-2222-4222-8222-222222222222';
  const versionId = '33333333-3333-4333-8333-333333333333';
  const topicId = '44444444-4444-4444-8444-444444444444';
  const lessonIdA = '55555555-5555-4555-8555-555555555555';
  const lessonIdB = '66666666-6666-4666-8666-666666666666';
  const canonicalLessonKey = '77777777-7777-4777-8777-777777777777';

  const activeCurriculum = {
    id: curriculumId,
    parishId,
    catechismLevelId: '88888888-8888-4888-8888-888888888888',
    code: 'khai-tam',
    name: 'Khai Tam',
    description: null,
    status: CurriculumStatus.Active,
    sourceLocale: 'vi-VN',
    currentPublishedVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies CurriculumEntity;

  const draftVersion = {
    id: versionId,
    curriculumId,
    versionNumber: 1,
    status: CurriculumVersionStatus.Draft,
    label: null,
    publishedAt: null,
    publishedByUserId: null,
    createdByUserId: '99999999-9999-4999-8999-999999999999',
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies CurriculumVersionEntity;

  const publishedVersion = {
    ...draftVersion,
    status: CurriculumVersionStatus.Published,
    publishedAt: new Date(),
  } satisfies CurriculumVersionEntity;

  const topic = {
    id: topicId,
    curriculumVersionId: versionId,
    code: 'topic-a',
    title: 'Topic A',
    description: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies TopicEntity;

  beforeEach(async () => {
    jest.spyOn(uuidUtil, 'generateUuidV4').mockReturnValue(canonicalLessonKey);
    jest.mocked(isUniqueConstraintViolation).mockReturnValue(false);

    lessonRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    topicRepository = {
      findOne: jest.fn(),
    };

    curriculumVersionRepository = {
      findOne: jest.fn(),
    };

    curriculumRepository = {
      findOne: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        { provide: getRepositoryToken(LessonEntity), useValue: lessonRepository },
        { provide: getRepositoryToken(TopicEntity), useValue: topicRepository },
        {
          provide: getRepositoryToken(CurriculumVersionEntity),
          useValue: curriculumVersionRepository,
        },
        { provide: getRepositoryToken(CurriculumEntity), useValue: curriculumRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    lessonService = moduleRef.get(LessonService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a lesson with generated canonicalLessonKey', async () => {
    const sortOrderQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxSortOrder: null }),
    };

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.createQueryBuilder.mockReturnValue(sortOrderQueryBuilder as never);

    const savedLesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.create.mockReturnValue(savedLesson);
    lessonRepository.save.mockResolvedValue(savedLesson);

    const snapshot = await lessonService.createLesson(topicId, {
      code: 'Lesson-A',
      title: 'Lesson A',
      estimatedDurationMinutes: 45,
    });

    expect(snapshot.canonicalLessonKey).toBe(canonicalLessonKey);
    expect(snapshot.code).toBe('lesson-a');
  });

  it('appends sort order when creating a lesson without explicit sort order', async () => {
    const sortOrderQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxSortOrder: 2 }),
    };

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.createQueryBuilder.mockReturnValue(sortOrderQueryBuilder as never);

    const savedLesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: null,
      title: 'Lesson A',
      summary: null,
      sortOrder: 3,
      estimatedDurationMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.create.mockReturnValue(savedLesson);
    lessonRepository.save.mockResolvedValue(savedLesson);

    const snapshot = await lessonService.createLesson(topicId, {
      title: 'Lesson A',
    });

    expect(snapshot.sortOrder).toBe(3);
  });

  it('rejects invalid lesson codes', async () => {
    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    await expect(
      lessonService.createLesson(topicId, {
        code: 'Invalid Code',
        title: 'Lesson A',
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(InvalidLessonCodeError);
  });

  it('maps duplicate lesson codes to LessonCodeAlreadyExistsError', async () => {
    const sortOrderQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxSortOrder: null }),
    };

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.createQueryBuilder.mockReturnValue(sortOrderQueryBuilder as never);

    const lessonEntity = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.create.mockReturnValue(lessonEntity);
    jest.mocked(isUniqueConstraintViolation).mockReturnValue(true);
    lessonRepository.save.mockRejectedValue(new Error('unique constraint'));

    await expect(
      lessonService.createLesson(topicId, {
        code: 'lesson-a',
        title: 'Lesson A',
      }),
    ).rejects.toBeInstanceOf(LessonCodeAlreadyExistsError);
  });

  it('updates lesson metadata without changing canonicalLessonKey', async () => {
    const lesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    const updatedLesson = {
      ...lesson,
      title: 'Updated Lesson',
      summary: 'Updated summary',
    } satisfies LessonEntity;

    lessonRepository.findOne.mockResolvedValue(lesson);
    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.save.mockResolvedValue(updatedLesson);

    const snapshot = await lessonService.updateLesson(lessonIdA, {
      title: 'Updated Lesson',
      summary: 'Updated summary',
    });

    expect(snapshot.canonicalLessonKey).toBe(canonicalLessonKey);
    expect(snapshot.title).toBe('Updated Lesson');
  });

  it('rejects canonicalLessonKey mutation attempts', async () => {
    const lesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.findOne.mockResolvedValue(lesson);

    await expect(
      lessonService.updateLesson(lessonIdA, {
        title: 'Updated Lesson',
        canonicalLessonKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      } as never),
    ).rejects.toBeInstanceOf(InvalidCanonicalLessonKeyMutationError);
  });

  it('rejects lesson mutations on non-draft versions', async () => {
    const lesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.findOne.mockResolvedValue(lesson);
    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(publishedVersion);

    await expect(
      lessonService.updateLesson(lessonIdA, { title: 'Updated Title' }),
    ).rejects.toBeInstanceOf(CurriculumVersionNotDraftError);
  });

  it('rejects reorder requests that do not include every lesson', async () => {
    const lessons = [
      {
        id: lessonIdA,
        curriculumVersionId: versionId,
        topicId,
        canonicalLessonKey,
        code: 'lesson-a',
        title: 'Lesson A',
        summary: null,
        sortOrder: 0,
        estimatedDurationMinutes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: lessonIdB,
        curriculumVersionId: versionId,
        topicId,
        canonicalLessonKey: '88888888-8888-4888-8888-888888888888',
        code: 'lesson-b',
        title: 'Lesson B',
        summary: null,
        sortOrder: 1,
        estimatedDurationMinutes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] satisfies LessonEntity[];

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const entityManager = {
      find: jest.fn().mockResolvedValue(lessons),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      lessonService.reorderLessons(topicId, { lessonIds: [lessonIdA] }),
    ).rejects.toBeInstanceOf(InvalidLessonReorderError);
  });

  it('rejects reorder requests with unknown lesson ids', async () => {
    const lessons = [
      {
        id: lessonIdA,
        curriculumVersionId: versionId,
        topicId,
        canonicalLessonKey,
        code: 'lesson-a',
        title: 'Lesson A',
        summary: null,
        sortOrder: 0,
        estimatedDurationMinutes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] satisfies LessonEntity[];

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const entityManager = {
      find: jest.fn().mockResolvedValue(lessons),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      lessonService.reorderLessons(topicId, {
        lessonIds: ['99999999-9999-4999-8999-999999999999'],
      }),
    ).rejects.toBeInstanceOf(InvalidLessonReorderError);
  });

  it('deletes lesson structure and compacts sort order', async () => {
    const lesson = {
      id: lessonIdA,
      curriculumVersionId: versionId,
      topicId,
      canonicalLessonKey,
      code: 'lesson-a',
      title: 'Lesson A',
      summary: null,
      sortOrder: 0,
      estimatedDurationMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies LessonEntity;

    lessonRepository.findOne.mockResolvedValue(lesson);
    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const entityManager = {
      delete: deleteMock,
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(lessonService.deleteLessonStructure(lessonIdA)).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith(LessonEntity, { id: lessonIdA });
  });
});
