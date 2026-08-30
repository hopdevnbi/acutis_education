import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import { CurriculumEntity } from '../entities/curriculum.entity';
import { LessonEntity } from '../entities/lesson.entity';
import { TopicEntity } from '../entities/topic.entity';
import { CurriculumStatus } from '../enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import { CurriculumVersionNotDraftError } from '../errors/curriculum.errors';
import { InvalidTopicReorderError, TopicNotEmptyError } from '../errors/topic.errors';
import { TopicService } from './topic.service';

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

describe('TopicService', () => {
  let topicService: TopicService;
  let topicRepository: jest.Mocked<
    Pick<Repository<TopicEntity>, 'create' | 'save' | 'findOne' | 'find' | 'createQueryBuilder'>
  >;
  let lessonRepository: jest.Mocked<Pick<Repository<LessonEntity>, 'count'>>;
  let curriculumVersionRepository: jest.Mocked<
    Pick<Repository<CurriculumVersionEntity>, 'findOne'>
  >;
  let curriculumRepository: jest.Mocked<Pick<Repository<CurriculumEntity>, 'findOne'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const curriculumId = '22222222-2222-4222-8222-222222222222';
  const versionId = '33333333-3333-4333-8333-333333333333';
  const topicIdA = '44444444-4444-4444-8444-444444444444';
  const topicIdB = '55555555-5555-4555-8555-555555555555';

  const activeCurriculum = {
    id: curriculumId,
    parishId,
    catechismLevelId: '66666666-6666-4666-8666-666666666666',
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
    createdByUserId: '77777777-7777-4777-8777-777777777777',
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies CurriculumVersionEntity;

  const publishedVersion = {
    ...draftVersion,
    status: CurriculumVersionStatus.Published,
    publishedAt: new Date(),
  } satisfies CurriculumVersionEntity;

  beforeEach(async () => {
    topicRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    lessonRepository = {
      count: jest.fn().mockResolvedValue(0),
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
        TopicService,
        { provide: getRepositoryToken(TopicEntity), useValue: topicRepository },
        { provide: getRepositoryToken(LessonEntity), useValue: lessonRepository },
        {
          provide: getRepositoryToken(CurriculumVersionEntity),
          useValue: curriculumVersionRepository,
        },
        { provide: getRepositoryToken(CurriculumEntity), useValue: curriculumRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    topicService = moduleRef.get(TopicService);
  });

  it('appends sort order when creating a topic without explicit sort order', async () => {
    const sortOrderQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxSortOrder: 2 }),
    };

    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    topicRepository.createQueryBuilder.mockReturnValue(sortOrderQueryBuilder as never);

    const savedTopic = {
      id: topicIdA,
      curriculumVersionId: versionId,
      code: 'topic-a',
      title: 'Topic A',
      description: null,
      sortOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies TopicEntity;

    topicRepository.create.mockReturnValue(savedTopic);
    topicRepository.save.mockResolvedValue(savedTopic);

    const snapshot = await topicService.createTopic(versionId, {
      code: 'topic-a',
      title: 'Topic A',
    });

    expect(snapshot.sortOrder).toBe(3);
  });

  it('rejects topic mutations on non-draft versions', async () => {
    const topic = {
      id: topicIdA,
      curriculumVersionId: versionId,
      code: 'topic-a',
      title: 'Topic A',
      description: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies TopicEntity;

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(publishedVersion);

    await expect(
      topicService.updateTopic(topicIdA, { title: 'Updated Title' }),
    ).rejects.toBeInstanceOf(CurriculumVersionNotDraftError);
  });

  it('rejects reorder requests that do not include every topic', async () => {
    const topics = [
      {
        id: topicIdA,
        curriculumVersionId: versionId,
        code: 'topic-a',
        title: 'Topic A',
        description: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: topicIdB,
        curriculumVersionId: versionId,
        code: 'topic-b',
        title: 'Topic B',
        description: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] satisfies TopicEntity[];

    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const entityManager = {
      find: jest.fn().mockResolvedValue(topics),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      topicService.reorderTopics(versionId, { topicIds: [topicIdA] }),
    ).rejects.toBeInstanceOf(InvalidTopicReorderError);
  });

  it('rejects reorder requests with unknown topic ids', async () => {
    const topics = [
      {
        id: topicIdA,
        curriculumVersionId: versionId,
        code: 'topic-a',
        title: 'Topic A',
        description: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] satisfies TopicEntity[];

    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const entityManager = {
      find: jest.fn().mockResolvedValue(topics),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      topicService.reorderTopics(versionId, {
        topicIds: ['99999999-9999-4999-8999-999999999999'],
      }),
    ).rejects.toBeInstanceOf(InvalidTopicReorderError);
  });

  it('deletes an empty topic', async () => {
    const topic = {
      id: topicIdA,
      curriculumVersionId: versionId,
      code: 'topic-a',
      title: 'Topic A',
      description: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies TopicEntity;

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.count.mockResolvedValue(0);

    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const entityManager = {
      delete: deleteMock,
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(topicService.deleteTopic(topicIdA)).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith(TopicEntity, { id: topicIdA });
  });

  it('rejects deleting a topic that still has lessons', async () => {
    const topic = {
      id: topicIdA,
      curriculumVersionId: versionId,
      code: 'topic-a',
      title: 'Topic A',
      description: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies TopicEntity;

    topicRepository.findOne.mockResolvedValue(topic);
    curriculumVersionRepository.findOne.mockResolvedValue(draftVersion);
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);
    lessonRepository.count.mockResolvedValue(2);

    await expect(topicService.deleteTopic(topicIdA)).rejects.toBeInstanceOf(TopicNotEmptyError);
  });
});
