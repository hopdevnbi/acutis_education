import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { ParishService } from '../../parish/services/parish.service';
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../constants/question-import.constants';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import type { QuestionExportPackageV1Snapshot } from '../interfaces/question-bank.interface';
import { QuestionImportValidationService } from './question-import-validation.service';

describe('QuestionImportValidationService', () => {
  let questionImportValidationService: QuestionImportValidationService;
  let parishService: jest.Mocked<Pick<ParishService, 'getParishById'>>;
  let questionRepository: jest.Mocked<
    Pick<Repository<QuestionEntity>, 'findOne' | 'createQueryBuilder'>
  >;
  let questionTagRepository: jest.Mocked<Pick<Repository<QuestionTagEntity>, 'findOne'>>;
  let curriculumService: jest.Mocked<
    Pick<CurriculumService, 'getCurriculumById' | 'assertCanonicalLessonKeyBelongsToCurriculum'>
  >;
  let mediaAssetService: jest.Mocked<Pick<MediaAssetService, 'assertAssetCategory'>>;

  const parishId = '11111111-1111-4111-8111-111111111111';

  const validPackage: QuestionExportPackageV1Snapshot = {
    schemaVersion: QUESTION_EXPORT_SCHEMA_VERSION,
    sourceQuestionCode: 'new-question',
    sourceLocale: 'vi-VN',
    versionNumber: 1,
    questionType: QuestionType.SingleChoice,
    prompt: 'Prompt text',
    instruction: null,
    explanation: null,
    difficulty: QuestionDifficulty.Easy,
    promptMediaJson: null,
    explanationMediaJson: null,
    options: [
      { exportKey: 'a', code: 'a', text: 'A', mediaAssetId: null },
      { exportKey: 'b', code: 'b', text: 'B', mediaAssetId: null },
    ],
    correctOptionKeys: ['a'],
    tagCodes: ['faith'],
    curriculumLinks: [],
  };

  beforeEach(async () => {
    parishService = {
      getParishById: jest.fn().mockResolvedValue({
        id: parishId,
        code: 'parish',
        name: 'Parish',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    questionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };

    questionTagRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        parishId,
        code: 'faith',
        name: 'Faith',
      }),
    };

    curriculumService = {
      getCurriculumById: jest.fn(),
      assertCanonicalLessonKeyBelongsToCurriculum: jest.fn(),
    };

    mediaAssetService = {
      assertAssetCategory: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionImportValidationService,
        { provide: ParishService, useValue: parishService },
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: getRepositoryToken(QuestionTagEntity), useValue: questionTagRepository },
        { provide: CurriculumService, useValue: curriculumService },
        { provide: MediaAssetService, useValue: mediaAssetService },
      ],
    }).compile();

    questionImportValidationService = moduleRef.get(QuestionImportValidationService);
  });

  it('returns valid result for a well-formed package without writing data', async () => {
    const result = await questionImportValidationService.validate(parishId, validPackage);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.normalizedPreview?.sourceQuestionCode).toBe('new-question');
    expect(questionRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('rejects unsupported schema versions', async () => {
    const result = await questionImportValidationService.validate(parishId, {
      ...validPackage,
      schemaVersion: 99,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'UNSUPPORTED_SCHEMA_VERSION')).toBe(true);
  });

  it('reports duplicate option export keys', async () => {
    const result = await questionImportValidationService.validate(parishId, {
      ...validPackage,
      options: [
        { exportKey: 'dup', code: 'a', text: 'A', mediaAssetId: null },
        { exportKey: 'dup', code: 'b', text: 'B', mediaAssetId: null },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_OPTION_EXPORT_KEY')).toBe(true);
  });

  it('reports unresolved correct option keys', async () => {
    const result = await questionImportValidationService.validate(parishId, {
      ...validPackage,
      correctOptionKeys: ['missing'],
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'CORRECT_OPTION_KEY_NOT_FOUND')).toBe(true);
  });

  it('reports question code conflicts in parish', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: '33333333-3333-4333-8333-333333333333',
        parishId,
        code: 'new-question',
      }),
    };
    questionRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as unknown as ReturnType<Repository<QuestionEntity>['createQueryBuilder']>,
    );

    const result = await questionImportValidationService.validate(parishId, validPackage);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'QUESTION_CODE_CONFLICT')).toBe(true);
  });

  it('reports missing tag codes', async () => {
    questionTagRepository.findOne.mockResolvedValue(null);

    const result = await questionImportValidationService.validate(parishId, validPackage);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'TAG_NOT_FOUND')).toBe(true);
  });
});
