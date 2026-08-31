import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager } from 'typeorm';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import { CurriculumStatus } from '../../curriculum/enums/curriculum-status.enum';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { LessonContentEntity } from '../entities/lesson-content.entity';
import {
  ContentBlockLimitExceededError,
  ContentDocumentTooLargeError,
  ContentNotFoundForPublishError,
  InvalidContentAssetIdError,
  InvalidContentDocumentError,
  LessonContentDraftOnlyError,
  LessonContentNotFoundError,
} from '../errors/learning-content.errors';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentDocumentV1,
} from '../interfaces/learning-content.interface';
import { LearningContentService } from './learning-content.service';
import { computeContentHash } from '../utils/content-hash.util';
import { validateContentDocumentV1 } from '../utils/content-document-v1.validator';

describe('LearningContentService', () => {
  const lessonId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const assetId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const contentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const versionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  let learningContentService: LearningContentService;
  let lessonContentRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let curriculumService: jest.Mocked<
    Pick<CurriculumService, 'getLessonCurriculumContext' | 'getLessonById' | 'getVersionTree'>
  >;
  let mediaAssetService: jest.Mocked<
    Pick<MediaAssetService, 'assertAssetCategory' | 'assertAssetReady' | 'getAssetSnapshot'>
  >;

  const draftContext = {
    lessonId,
    topicId: '11111111-1111-4111-8111-111111111111',
    curriculumVersionId: versionId,
    curriculumId: '22222222-2222-4222-8222-222222222222',
    parishId: '33333333-3333-4333-8333-333333333333',
    canonicalLessonKey: '44444444-4444-4444-8444-444444444444',
    versionStatus: CurriculumVersionStatus.Draft,
    curriculumStatus: CurriculumStatus.Active,
  };

  const validDocument: ContentDocumentV1 = {
    schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
    blocks: [
      { type: 'heading', level: 1, text: 'Lesson Title' },
      { type: 'paragraph', text: 'Opening paragraph.' },
      { type: 'bullet_list', items: ['First point', 'Second point'] },
      { type: 'numbered_list', items: ['Step one', 'Step two'] },
      { type: 'scripture_ref', reference: 'John 3:16', text: 'For God so loved the world.' },
      { type: 'callout', variant: 'tip', text: 'Remember to pray.' },
      { type: 'image_ref', assetId, alt: 'Alt text', caption: 'Caption text' },
      { type: 'video_ref', assetId, caption: 'Intro video' },
    ],
  };

  beforeEach(async () => {
    lessonContentRepository = {
      findOne: jest.fn(),
      create: jest.fn((value: LessonContentEntity) => value),
      save: jest.fn((value: LessonContentEntity) =>
        Promise.resolve({
          ...value,
          id: contentId,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
      delete: jest.fn(),
      find: jest.fn(),
    };

    curriculumService = {
      getLessonCurriculumContext: jest.fn().mockResolvedValue(draftContext),
      getLessonById: jest.fn().mockResolvedValue({ id: lessonId, title: 'Lesson' }),
      getVersionTree: jest.fn(),
    };

    mediaAssetService = {
      assertAssetCategory: jest.fn().mockResolvedValue({
        id: assetId,
        status: 'READY',
        mediaCategory: 'IMAGE',
      }),
      assertAssetReady: jest.fn(),
      getAssetSnapshot: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningContentService,
        {
          provide: getRepositoryToken(LessonContentEntity),
          useValue: lessonContentRepository,
        },
        {
          provide: CurriculumService,
          useValue: curriculumService,
        },
        {
          provide: MediaAssetService,
          useValue: mediaAssetService,
        },
      ],
    }).compile();

    learningContentService = module.get(LearningContentService);
  });

  describe('content document validation', () => {
    it('accepts all supported block types', () => {
      const document = validateContentDocumentV1(validDocument);

      expect(document.blocks).toHaveLength(8);
      expect(document.blocks[0]?.type).toBe('heading');
      expect(document.blocks[7]?.type).toBe('video_ref');
    });

    it('trims text fields and optional strings', () => {
      const document = validateContentDocumentV1({
        schemaVersion: 1,
        blocks: [
          { type: 'paragraph', text: '  trimmed text  ' },
          { type: 'scripture_ref', reference: '  Matt 5:3 ', text: '  blessed  ' },
        ],
      });

      expect(document.blocks[0]).toEqual({ type: 'paragraph', text: 'trimmed text' });
      expect(document.blocks[1]).toEqual({
        type: 'scripture_ref',
        reference: 'Matt 5:3',
        text: 'blessed',
      });
    });

    it('rejects unknown block types', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'unknown_block', text: 'x' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects unknown block keys', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: 'ok', extra: 'nope' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects HTML markup in text fields', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: '<script>alert(1)</script>' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects script URLs in text fields', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: 'javascript:alert(1)' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects invalid asset ids', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'image_ref', assetId: 'not-a-uuid' }],
        }),
      ).toThrow(InvalidContentAssetIdError);
    });

    it('rejects invalid callout variants', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'callout', variant: 'warning', text: 'note' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects invalid heading levels', () => {
      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'heading', level: 4, text: 'Too deep' }],
        }),
      ).toThrow(InvalidContentDocumentError);
    });

    it('rejects more than 500 blocks', () => {
      const blocks = Array.from({ length: 501 }, () => ({
        type: 'paragraph',
        text: 'block',
      }));

      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks,
        }),
      ).toThrow(ContentBlockLimitExceededError);
    });

    it('rejects documents larger than 256KB', () => {
      const hugeText = 'x'.repeat(260 * 1024);

      expect(() =>
        validateContentDocumentV1({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: hugeText }],
        }),
      ).toThrow(ContentDocumentTooLargeError);
    });
  });

  describe('content hash', () => {
    it('is deterministic for the same document', () => {
      const firstHash = computeContentHash(validDocument);
      const secondHash = computeContentHash(validDocument);

      expect(firstHash).toBe(secondHash);
      expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('changes when block content changes', () => {
      const firstHash = computeContentHash(validDocument);
      const changedDocument: ContentDocumentV1 = {
        ...validDocument,
        blocks: [...validDocument.blocks, { type: 'paragraph', text: 'Added block' }],
      };

      expect(computeContentHash(changedDocument)).not.toBe(firstHash);
    });
  });

  describe('upsertLessonContent', () => {
    it('creates content for draft lessons', async () => {
      lessonContentRepository.findOne.mockResolvedValue(null);

      const snapshot = await learningContentService.upsertLessonContent(lessonId, {
        document: validDocument,
      });

      expect(snapshot.lessonId).toBe(lessonId);
      expect(snapshot.contentHash).toBe(computeContentHash(validDocument));
      expect(snapshot.document.blocks).toHaveLength(8);
      expect(lessonContentRepository.create).toHaveBeenCalled();
      expect(lessonContentRepository.save).toHaveBeenCalled();
    });

    it('updates existing content for draft lessons', async () => {
      lessonContentRepository.findOne.mockResolvedValue({
        id: contentId,
        lessonId,
        contentSchemaVersion: 1,
        contentJson: JSON.stringify(validDocument),
        contentHash: 'old-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const snapshot = await learningContentService.upsertLessonContent(lessonId, {
        document: {
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: 'Updated body' }],
        },
      });

      expect(snapshot.contentHash).toBe(
        computeContentHash({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: 'Updated body' }],
        }),
      );
      expect(lessonContentRepository.create).not.toHaveBeenCalled();
    });

    it('rejects upsert when version is not draft', async () => {
      curriculumService.getLessonCurriculumContext.mockResolvedValue({
        ...draftContext,
        versionStatus: CurriculumVersionStatus.Published,
      });

      await expect(
        learningContentService.upsertLessonContent(lessonId, { document: validDocument }),
      ).rejects.toBeInstanceOf(LessonContentDraftOnlyError);
    });
  });

  describe('getLessonContent', () => {
    it('returns stored content', async () => {
      lessonContentRepository.findOne.mockResolvedValue({
        id: contentId,
        lessonId,
        contentSchemaVersion: 1,
        contentJson: JSON.stringify(validDocument),
        contentHash: computeContentHash(validDocument),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const snapshot = await learningContentService.getLessonContent(lessonId);

      expect(snapshot.document.blocks).toHaveLength(8);
    });

    it('throws when content is missing', async () => {
      lessonContentRepository.findOne.mockResolvedValue(null);

      await expect(learningContentService.getLessonContent(lessonId)).rejects.toBeInstanceOf(
        LessonContentNotFoundError,
      );
    });
  });

  describe('validateLessonHasNonEmptyContent', () => {
    it('passes when content exists', async () => {
      lessonContentRepository.findOne.mockResolvedValue({
        id: contentId,
        lessonId,
        contentSchemaVersion: 1,
        contentJson: JSON.stringify({
          schemaVersion: 1,
          blocks: [{ type: 'paragraph', text: 'Ready to publish' }],
        }),
        contentHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        learningContentService.validateLessonHasNonEmptyContent(lessonId),
      ).resolves.toBeUndefined();
    });

    it('throws when content is missing or empty', async () => {
      lessonContentRepository.findOne.mockResolvedValue(null);

      await expect(
        learningContentService.validateLessonHasNonEmptyContent(lessonId),
      ).rejects.toBeInstanceOf(ContentNotFoundForPublishError);
    });
  });

  describe('collectPublishValidationIssues', () => {
    it('returns issues for lessons without content', async () => {
      const missingLessonId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

      curriculumService.getVersionTree.mockResolvedValue({
        version: {
          id: versionId,
          curriculumId: draftContext.curriculumId,
          versionNumber: 1,
          status: CurriculumVersionStatus.Draft,
          label: null,
          publishedAt: null,
          publishedByUserId: null,
          createdByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        topics: [
          {
            id: draftContext.topicId,
            code: null,
            title: 'Topic',
            description: null,
            sortOrder: 0,
            lessons: [
              {
                id: lessonId,
                canonicalLessonKey: draftContext.canonicalLessonKey,
                code: null,
                title: 'With content',
                summary: null,
                sortOrder: 0,
                estimatedDurationMinutes: null,
              },
              {
                id: missingLessonId,
                canonicalLessonKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
                code: null,
                title: 'Missing content',
                summary: null,
                sortOrder: 1,
                estimatedDurationMinutes: null,
              },
            ],
          },
        ],
      });

      lessonContentRepository.find.mockResolvedValue([
        {
          id: contentId,
          lessonId,
          contentSchemaVersion: 1,
          contentJson: JSON.stringify({
            schemaVersion: 1,
            blocks: [{ type: 'paragraph', text: 'Body' }],
          }),
          contentHash: 'hash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const issues = await learningContentService.collectPublishValidationIssues(versionId);

      expect(issues).toEqual([
        {
          lessonId: missingLessonId,
          lessonTitle: 'Missing content',
          code: 'CONTENT_MISSING',
          message: 'Lesson content is missing.',
        },
      ]);
    });
  });

  describe('cloneContentForLessons', () => {
    it('copies rows preserving hash and json', async () => {
      const targetLessonId = '99999999-9999-4999-8999-999999999999';
      const createMock = jest.fn((value: LessonContentEntity) => value);
      const saveMock = jest.fn((value: LessonContentEntity) => Promise.resolve(value));
      const entityManager = {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue([
            {
              lessonId,
              contentSchemaVersion: 1,
              contentJson: JSON.stringify(validDocument),
              contentHash: computeContentHash(validDocument),
            },
          ]),
          create: createMock,
          save: saveMock,
        }),
      } as unknown as EntityManager;

      await learningContentService.cloneContentForLessons(
        new Map([[lessonId, targetLessonId]]),
        entityManager,
      );

      expect(createMock).toHaveBeenCalledWith({
        lessonId: targetLessonId,
        contentSchemaVersion: 1,
        contentJson: JSON.stringify(validDocument),
        contentHash: computeContentHash(validDocument),
      });
      expect(saveMock).toHaveBeenCalled();
    });
  });
});
