import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  DuplicateQuestionOptionCodeError,
  InvalidCorrectOptionIdsError,
  InvalidQuestionOptionRepresentationError,
  QuestionVersionNotDraftError,
} from '../errors/question-bank.errors';
import { QuestionOptionService } from './question-option.service';

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

describe('QuestionOptionService', () => {
  let questionOptionService: QuestionOptionService;
  let questionOptionRepository: jest.Mocked<
    Pick<Repository<QuestionOptionEntity>, 'find' | 'manager'>
  >;
  let questionCorrectOptionRepository: jest.Mocked<
    Pick<Repository<QuestionCorrectOptionEntity>, 'find'>
  >;
  let questionVersionRepository: jest.Mocked<Pick<Repository<QuestionVersionEntity>, 'findOne'>>;
  let mediaAssetService: jest.Mocked<Pick<MediaAssetService, 'assertAssetCategory'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const versionId = '44444444-4444-4444-8444-444444444444';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const optionAId = '66666666-6666-4666-8666-666666666666';
  const optionBId = '77777777-7777-4777-8777-777777777777';

  const draftVersion = {
    id: versionId,
    questionId,
    versionNumber: 1,
    status: QuestionVersionStatus.Draft,
    questionType: QuestionType.SingleChoice,
    prompt: 'Prompt',
    instruction: null,
    explanation: null,
    promptMediaJson: null,
    explanationMediaJson: null,
    answerDefinitionJson: null,
    difficulty: null,
    sourceContentHash: null,
    createdByUserId: null,
    publishedByUserId: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies QuestionVersionEntity;

  beforeEach(async () => {
    questionOptionRepository = {
      find: jest.fn().mockResolvedValue([]),
      manager: {} as EntityManager,
    };

    questionCorrectOptionRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    questionVersionRepository = {
      findOne: jest.fn().mockResolvedValue(draftVersion),
    };

    mediaAssetService = {
      assertAssetCategory: jest.fn().mockResolvedValue({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        mediaCategory: 'IMAGE',
      }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionOptionService,
        { provide: getRepositoryToken(QuestionOptionEntity), useValue: questionOptionRepository },
        {
          provide: getRepositoryToken(QuestionCorrectOptionEntity),
          useValue: questionCorrectOptionRepository,
        },
        { provide: getRepositoryToken(QuestionVersionEntity), useValue: questionVersionRepository },
        { provide: getRepositoryToken(QuestionEntity), useValue: {} },
        { provide: MediaAssetService, useValue: mediaAssetService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    questionOptionService = moduleRef.get(QuestionOptionService);
  });

  it('lists options ordered by sort order', async () => {
    questionOptionRepository.find.mockResolvedValue([
      {
        id: optionBId,
        questionVersionId: versionId,
        code: 'b',
        text: 'B',
        mediaAssetId: null,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: optionAId,
        questionVersionId: versionId,
        code: 'a',
        text: 'A',
        mediaAssetId: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const options = await questionOptionService.listOptionsByVersion(versionId);

    expect(options).toHaveLength(2);
    expect(questionOptionRepository.find).toHaveBeenCalledWith({
      where: { questionVersionId: versionId },
      order: { sortOrder: 'ASC' },
    });
  });

  it('rejects replace when an option has no text or media representation', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValueOnce(draftVersion).mockResolvedValueOnce({
        id: questionId,
        parishId: '11111111-1111-4111-8111-111111111111',
        code: null,
        status: QuestionStatus.Active,
        sourceLocale: 'vi-VN',
        currentPublishedVersionId: null,
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionOptionService.replaceDraftOptions(versionId, [
        { text: 'Only one', sortOrder: 1 },
        { text: null, mediaAssetId: null, sortOrder: 2 },
      ]),
    ).rejects.toBeInstanceOf(InvalidQuestionOptionRepresentationError);
  });

  it('rejects duplicate option codes on replace', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValueOnce(draftVersion).mockResolvedValueOnce({
        id: questionId,
        parishId: '11111111-1111-4111-8111-111111111111',
        code: null,
        status: QuestionStatus.Active,
        sourceLocale: 'vi-VN',
        currentPublishedVersionId: null,
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionOptionService.replaceDraftOptions(versionId, [
        { code: 'same', text: 'A', sortOrder: 1 },
        { code: 'same', text: 'B', sortOrder: 2 },
      ]),
    ).rejects.toBeInstanceOf(DuplicateQuestionOptionCodeError);
  });

  it('rejects correct options that do not belong to the version', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValueOnce(draftVersion).mockResolvedValueOnce({
        id: questionId,
        parishId: '11111111-1111-4111-8111-111111111111',
        code: null,
        status: QuestionStatus.Active,
        sourceLocale: 'vi-VN',
        currentPublishedVersionId: null,
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      find: jest.fn().mockResolvedValue([
        {
          id: optionAId,
          questionVersionId: versionId,
          code: 'a',
          text: 'A',
          mediaAssetId: null,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: optionBId,
          questionVersionId: versionId,
          code: 'b',
          text: 'B',
          mediaAssetId: null,
          sortOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionOptionService.setCorrectOptions(versionId, [
        optionAId,
        '99999999-9999-4999-8999-999999999999',
      ]),
    ).rejects.toBeInstanceOf(InvalidCorrectOptionIdsError);
  });

  it('rejects correct option updates on published versions', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValue({
        ...draftVersion,
        status: QuestionVersionStatus.Published,
      }),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionOptionService.setCorrectOptions(versionId, [optionAId]),
    ).rejects.toBeInstanceOf(QuestionVersionNotDraftError);
  });
});
