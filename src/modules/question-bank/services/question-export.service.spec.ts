import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../constants/question-import.constants';
import { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import { QuestionExportService } from './question-export.service';

describe('QuestionExportService', () => {
  let questionExportService: QuestionExportService;
  let questionVersionRepository: jest.Mocked<Pick<Repository<QuestionVersionEntity>, 'findOne'>>;
  let questionRepository: jest.Mocked<Pick<Repository<QuestionEntity>, 'findOne'>>;
  let questionOptionRepository: jest.Mocked<Pick<Repository<QuestionOptionEntity>, 'find'>>;
  let questionCorrectOptionRepository: jest.Mocked<
    Pick<Repository<QuestionCorrectOptionEntity>, 'find'>
  >;
  let questionTagLinkRepository: jest.Mocked<Pick<Repository<QuestionTagLinkEntity>, 'find'>>;
  let questionTagRepository: jest.Mocked<Pick<Repository<QuestionTagEntity>, 'find'>>;
  let questionCurriculumLinkRepository: jest.Mocked<
    Pick<Repository<QuestionCurriculumLinkEntity>, 'find'>
  >;

  const versionId = '44444444-4444-4444-8444-444444444444';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const optionAId = '66666666-6666-4666-8666-666666666666';
  const optionBId = '77777777-7777-4777-8777-777777777777';

  beforeEach(async () => {
    questionVersionRepository = { findOne: jest.fn() };
    questionRepository = { findOne: jest.fn() };
    questionOptionRepository = { find: jest.fn() };
    questionCorrectOptionRepository = { find: jest.fn() };
    questionTagLinkRepository = { find: jest.fn() };
    questionTagRepository = { find: jest.fn() };
    questionCurriculumLinkRepository = { find: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionExportService,
        { provide: getRepositoryToken(QuestionVersionEntity), useValue: questionVersionRepository },
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: getRepositoryToken(QuestionOptionEntity), useValue: questionOptionRepository },
        {
          provide: getRepositoryToken(QuestionCorrectOptionEntity),
          useValue: questionCorrectOptionRepository,
        },
        { provide: getRepositoryToken(QuestionTagLinkEntity), useValue: questionTagLinkRepository },
        { provide: getRepositoryToken(QuestionTagEntity), useValue: questionTagRepository },
        {
          provide: getRepositoryToken(QuestionCurriculumLinkEntity),
          useValue: questionCurriculumLinkRepository,
        },
      ],
    }).compile();

    questionExportService = moduleRef.get(QuestionExportService);
  });

  it('builds export package v1 with option keys and tag codes', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 2,
      status: QuestionVersionStatus.Published,
      questionType: QuestionType.SingleChoice,
      prompt: 'Câu hỏi về Bí tích Rửa tội',
      instruction: null,
      explanation: 'Giải thích',
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: QuestionDifficulty.Easy,
      sourceContentHash: 'hash',
      createdByUserId: null,
      publishedByUserId: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    questionRepository.findOne.mockResolvedValue({
      id: questionId,
      parishId: '11111111-1111-4111-8111-111111111111',
      code: 'baptism-basics',
      sourceLocale: 'vi-VN',
    } as QuestionEntity);

    questionOptionRepository.find.mockResolvedValue([
      {
        id: optionAId,
        questionVersionId: versionId,
        code: 'a',
        text: 'Đúng',
        mediaAssetId: null,
        sortOrder: 1,
      },
      {
        id: optionBId,
        questionVersionId: versionId,
        code: 'b',
        text: 'Sai',
        mediaAssetId: null,
        sortOrder: 2,
      },
    ] as QuestionOptionEntity[]);

    questionCorrectOptionRepository.find.mockResolvedValue([
      { questionVersionId: versionId, optionId: optionAId },
    ] as QuestionCorrectOptionEntity[]);

    questionTagLinkRepository.find.mockResolvedValue([
      { questionId, tagId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    ] as QuestionTagLinkEntity[]);

    questionTagRepository.find.mockResolvedValue([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        code: 'sacraments',
        name: 'Sacraments',
      },
    ] as QuestionTagEntity[]);

    questionCurriculumLinkRepository.find.mockResolvedValue([
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        questionId,
        parishId: '11111111-1111-4111-8111-111111111111',
        curriculumId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        canonicalLessonKey: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      },
    ] as QuestionCurriculumLinkEntity[]);

    const exportPackage = await questionExportService.buildExportPackage(versionId);

    expect(exportPackage.schemaVersion).toBe(QUESTION_EXPORT_SCHEMA_VERSION);
    expect(exportPackage.sourceLocale).toBe('vi-VN');
    expect(exportPackage.correctOptionKeys).toEqual(['a']);
    expect(exportPackage.tagCodes).toEqual(['sacraments']);
    expect(exportPackage.curriculumLinks).toHaveLength(1);
    expect(exportPackage.options.map((option) => option.exportKey)).toEqual(['a', 'b']);
    expect(JSON.stringify(exportPackage)).not.toContain('storage');
    expect(JSON.stringify(exportPackage)).not.toContain('password');
  });
});
