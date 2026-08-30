import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import { CurriculumPublishValidationError } from '../../curriculum/errors/curriculum.errors';
import type { CurriculumVersionSnapshot } from '../../curriculum/interfaces/curriculum.interface';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LessonService } from '../../curriculum/services/lesson.service';
import { LearningContentService } from '../../learning-content/services/learning-content.service';
import { CurriculumVersionOrchestrationService } from './curriculum-version-orchestration.service';

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

describe('CurriculumVersionOrchestrationService', () => {
  const versionId = '44444444-4444-4444-8444-444444444444';
  const userId = '55555555-5555-4555-8555-555555555555';
  const topicId = '66666666-6666-4666-8666-666666666666';
  const lessonId = '77777777-7777-4777-8777-777777777777';

  let orchestrationService: CurriculumVersionOrchestrationService;
  let curriculumService: jest.Mocked<
    Pick<
      CurriculumService,
      'getVersionTree' | 'publishDraftVersionTransaction' | 'cloneVersionStructureTransaction'
    >
  >;
  let learningContentService: jest.Mocked<
    Pick<
      LearningContentService,
      'collectPublishValidationIssues' | 'cloneContentForLessons' | 'deleteByLessonId'
    >
  >;
  let lessonService: jest.Mocked<Pick<LessonService, 'deleteLessonStructureTransaction'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let entityManager: EntityManager;

  const publishedSnapshot: CurriculumVersionSnapshot = {
    id: versionId,
    curriculumId: '33333333-3333-4333-8333-333333333333',
    versionNumber: 1,
    status: CurriculumVersionStatus.Published,
    label: 'Published v1',
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedByUserId: userId,
    createdByUserId: userId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    entityManager = {} as EntityManager;

    curriculumService = {
      getVersionTree: jest.fn(),
      publishDraftVersionTransaction: jest.fn(),
      cloneVersionStructureTransaction: jest.fn(),
    };

    learningContentService = {
      collectPublishValidationIssues: jest.fn(),
      cloneContentForLessons: jest.fn(),
      deleteByLessonId: jest.fn(),
    };

    lessonService = {
      deleteLessonStructureTransaction: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    mockDataSourceTransaction(dataSource, entityManager);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumVersionOrchestrationService,
        { provide: CurriculumService, useValue: curriculumService },
        { provide: LearningContentService, useValue: learningContentService },
        { provide: LessonService, useValue: lessonService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    orchestrationService = moduleRef.get(CurriculumVersionOrchestrationService);
  });

  describe('publishVersion', () => {
    it('throws CurriculumPublishValidationError when version has no topics', async () => {
      curriculumService.getVersionTree.mockResolvedValue({
        version: publishedSnapshot,
        topics: [],
      });
      learningContentService.collectPublishValidationIssues.mockResolvedValue([]);

      await expect(orchestrationService.publishVersion(versionId, userId)).rejects.toBeInstanceOf(
        CurriculumPublishValidationError,
      );

      try {
        await orchestrationService.publishVersion(versionId, userId);
        throw new Error('Expected publish validation failure');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CurriculumPublishValidationError);
        const publishError = error as CurriculumPublishValidationError;
        expect(publishError.issues.some((issue) => issue.code === 'NO_TOPICS')).toBe(true);
      }

      expect(curriculumService.publishDraftVersionTransaction).not.toHaveBeenCalled();
    });

    it('throws CurriculumPublishValidationError when a topic has no lessons', async () => {
      curriculumService.getVersionTree.mockResolvedValue({
        version: publishedSnapshot,
        topics: [
          {
            id: topicId,
            code: null,
            title: 'Empty Topic',
            description: null,
            sortOrder: 0,
            lessons: [],
          },
        ],
      });
      learningContentService.collectPublishValidationIssues.mockResolvedValue([]);

      try {
        await orchestrationService.publishVersion(versionId, userId);
        throw new Error('Expected publish validation failure');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CurriculumPublishValidationError);
        const publishError = error as CurriculumPublishValidationError;
        const topicIssue = publishError.issues.find(
          (issue) => issue.code === 'TOPIC_WITHOUT_LESSONS',
        );

        expect(topicIssue).toBeDefined();
        expect(topicIssue?.resourceId).toBe(topicId);
      }
    });

    it('throws CurriculumPublishValidationError when lesson content is missing', async () => {
      curriculumService.getVersionTree.mockResolvedValue({
        version: publishedSnapshot,
        topics: [
          {
            id: topicId,
            code: null,
            title: 'Topic A',
            description: null,
            sortOrder: 0,
            lessons: [
              {
                id: lessonId,
                code: null,
                title: 'Lesson A',
                summary: null,
                sortOrder: 0,
                estimatedDurationMinutes: 45,
                canonicalLessonKey: '88888888-8888-4888-8888-888888888888',
              },
            ],
          },
        ],
      });
      learningContentService.collectPublishValidationIssues.mockResolvedValue([
        {
          lessonId,
          lessonTitle: 'Lesson A',
          code: 'CONTENT_MISSING',
          message: 'Lesson content is missing.',
        },
      ]);

      try {
        await orchestrationService.publishVersion(versionId, userId);
        throw new Error('Expected publish validation failure');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CurriculumPublishValidationError);
        const publishError = error as CurriculumPublishValidationError;
        const contentIssue = publishError.issues.find((issue) => issue.code === 'CONTENT_MISSING');

        expect(contentIssue).toBeDefined();
        expect(contentIssue?.resourceId).toBe(lessonId);
        expect(contentIssue?.path).toBe(`lessons/${lessonId}/content`);
      }
    });

    it('publishes when structural and content validation pass', async () => {
      curriculumService.getVersionTree.mockResolvedValue({
        version: publishedSnapshot,
        topics: [
          {
            id: topicId,
            code: null,
            title: 'Topic A',
            description: null,
            sortOrder: 0,
            lessons: [
              {
                id: lessonId,
                code: null,
                title: 'Lesson A',
                summary: null,
                sortOrder: 0,
                estimatedDurationMinutes: 45,
                canonicalLessonKey: '88888888-8888-4888-8888-888888888888',
              },
            ],
          },
        ],
      });
      learningContentService.collectPublishValidationIssues.mockResolvedValue([]);
      curriculumService.publishDraftVersionTransaction.mockResolvedValue(publishedSnapshot);

      const result = await orchestrationService.publishVersion(versionId, userId);

      expect(result).toEqual(publishedSnapshot);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(curriculumService.publishDraftVersionTransaction).toHaveBeenCalledWith(
        versionId,
        userId,
        entityManager,
      );
    });
  });

  describe('cloneVersionToDraft', () => {
    it('clones version structure and lesson content inside a transaction', async () => {
      const lessonIdMap = new Map<string, string>([
        [lessonId, '99999999-9999-4999-8999-999999999999'],
      ]);
      const draftSnapshot: CurriculumVersionSnapshot = {
        ...publishedSnapshot,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        status: CurriculumVersionStatus.Draft,
        versionNumber: 2,
        publishedAt: null,
        publishedByUserId: null,
      };

      curriculumService.cloneVersionStructureTransaction.mockResolvedValue({
        versionSnapshot: draftSnapshot,
        lessonIdMap,
      });
      learningContentService.cloneContentForLessons.mockResolvedValue(undefined);

      const result = await orchestrationService.cloneVersionToDraft(versionId, userId);

      expect(result).toEqual(draftSnapshot);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(curriculumService.cloneVersionStructureTransaction).toHaveBeenCalledWith(
        versionId,
        userId,
        entityManager,
      );
      expect(learningContentService.cloneContentForLessons).toHaveBeenCalledWith(
        lessonIdMap,
        entityManager,
      );
    });
  });

  describe('deleteLessonWithContent', () => {
    it('deletes lesson content before removing lesson structure', async () => {
      const callOrder: string[] = [];

      learningContentService.deleteByLessonId.mockImplementation(() => {
        callOrder.push('content');
        return Promise.resolve();
      });
      lessonService.deleteLessonStructureTransaction.mockImplementation(() => {
        callOrder.push('structure');
        return Promise.resolve();
      });

      await orchestrationService.deleteLessonWithContent(lessonId);

      expect(callOrder).toEqual(['content', 'structure']);
      expect(learningContentService.deleteByLessonId).toHaveBeenCalledWith(lessonId, entityManager);
      expect(lessonService.deleteLessonStructureTransaction).toHaveBeenCalledWith(
        lessonId,
        entityManager,
      );
    });
  });
});
