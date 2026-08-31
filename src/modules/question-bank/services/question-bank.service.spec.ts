import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  QueryFailedError,
  type EntityManager,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { ParishService } from '../../parish/services/parish.service';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  InvalidQuestionSourceLocaleError,
  QuestionCodeAlreadyExistsError,
  QuestionDraftAlreadyExistsError,
  QuestionNotFoundError,
  QuestionSourceLocaleImmutableError,
  QuestionUpdateRequiresFieldsError,
  QuestionVersionNotDraftError,
} from '../errors/question-bank.errors';
import { QuestionBankService } from './question-bank.service';

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

describe('QuestionBankService', () => {
  let questionBankService: QuestionBankService;
  let questionRepository: jest.Mocked<
    Pick<Repository<QuestionEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder' | 'count'>
  >;
  let questionVersionRepository: jest.Mocked<
    Pick<Repository<QuestionVersionEntity>, 'findOne' | 'count' | 'save'>
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<QuestionEntity>,
      'where' | 'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const versionId = '44444444-4444-4444-8444-444444444444';
  const userId = '55555555-5555-4555-8555-555555555555';

  const parishSnapshot = {
    id: parishId,
    code: 'parish',
    name: 'Parish',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeQuestion = {
    id: questionId,
    parishId,
    code: 'baptism-basics',
    status: QuestionStatus.Active,
    sourceLocale: 'vi-VN',
    currentPublishedVersionId: null,
    createdByUserId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies QuestionEntity;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    questionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    questionVersionRepository = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };

    parishService = {
      assertParishActive: jest.fn().mockResolvedValue(parishSnapshot),
      getParishById: jest.fn().mockResolvedValue(parishSnapshot),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: getRepositoryToken(QuestionVersionEntity), useValue: questionVersionRepository },
        { provide: ParishService, useValue: parishService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    questionBankService = moduleRef.get(QuestionBankService);
  });

  it('creates a question with normalized source locale and initial draft version', async () => {
    const savedQuestion = { ...activeQuestion, code: 'baptism-basics' } satisfies QuestionEntity;
    const savedVersion = {
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Draft,
      questionType: QuestionType.SingleChoice,
      prompt: 'What is baptism?',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: null,
      sourceContentHash: null,
      createdByUserId: userId,
      publishedByUserId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies QuestionVersionEntity;

    const entityManager = {
      create: jest.fn().mockReturnValueOnce(savedQuestion).mockReturnValueOnce(savedVersion),
      save: jest.fn().mockResolvedValueOnce(savedQuestion).mockResolvedValueOnce(savedVersion),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    const result = await questionBankService.createQuestion(parishId, {
      code: '  Baptism-Basics  ',
      sourceLocale: ' vi-vn ',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'What is baptism?',
      },
    });

    expect(result.question.sourceLocale).toBe('vi-VN');
    expect(result.question.code).toBe('baptism-basics');
    expect(result.initialVersion.versionNumber).toBe(1);
    expect(result.initialVersion.status).toBe(QuestionVersionStatus.Draft);
  });

  it('rejects question creation with invalid source locale', async () => {
    await expect(
      questionBankService.createQuestion(parishId, {
        sourceLocale: '123',
        createdByUserId: userId,
        draft: { questionType: QuestionType.TrueFalse },
      }),
    ).rejects.toBeInstanceOf(InvalidQuestionSourceLocaleError);
  });

  it('maps duplicate question code to QuestionCodeAlreadyExistsError', async () => {
    const savedQuestion = { ...activeQuestion, code: 'dup-code' } satisfies QuestionEntity;

    const entityManager = {
      create: jest.fn().mockReturnValue(savedQuestion),
      save: jest.fn().mockRejectedValue(new QueryFailedError('', [], { number: 2627 } as never)),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionBankService.createQuestion(parishId, {
        code: 'dup-code',
        sourceLocale: 'vi-VN',
        createdByUserId: userId,
        draft: { questionType: QuestionType.TrueFalse },
      }),
    ).rejects.toBeInstanceOf(QuestionCodeAlreadyExistsError);
  });

  it('rejects updates when no fields are provided', async () => {
    await expect(questionBankService.updateQuestion(questionId, {})).rejects.toBeInstanceOf(
      QuestionUpdateRequiresFieldsError,
    );
  });

  it('rejects source locale updates after a published version exists', async () => {
    questionRepository.findOne.mockResolvedValue({
      ...activeQuestion,
      currentPublishedVersionId: versionId,
    });

    await expect(
      questionBankService.updateQuestion(questionId, { sourceLocale: 'en-US' }),
    ).rejects.toBeInstanceOf(QuestionSourceLocaleImmutableError);
  });

  it('rejects a second draft when one already exists', async () => {
    const existingDraft = {
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Draft,
      questionType: QuestionType.TrueFalse,
      prompt: '',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: null,
      sourceContentHash: null,
      createdByUserId: userId,
      publishedByUserId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies QuestionVersionEntity;

    const entityManager = {
      findOne: jest.fn().mockResolvedValueOnce(activeQuestion).mockResolvedValueOnce(existingDraft),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      questionBankService.createDraftVersion(questionId, {
        createdByUserId: userId,
        questionType: QuestionType.TrueFalse,
      }),
    ).rejects.toBeInstanceOf(QuestionDraftAlreadyExistsError);
  });

  it('rejects draft version updates when version is not draft', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Published,
      questionType: QuestionType.TrueFalse,
      prompt: 'Published',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: null,
      sourceContentHash: null,
      createdByUserId: userId,
      publishedByUserId: userId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      questionBankService.updateDraftVersion(versionId, { prompt: 'Updated' }),
    ).rejects.toBeInstanceOf(QuestionVersionNotDraftError);
  });

  it('returns a question snapshot by id', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);

    const snapshot = await questionBankService.getQuestionById(questionId);

    expect(snapshot.id).toBe(questionId);
    expect(snapshot.code).toBe('baptism-basics');
  });

  it('throws QuestionNotFoundError when question is missing', async () => {
    questionRepository.findOne.mockResolvedValue(null);

    await expect(questionBankService.getQuestionById(questionId)).rejects.toBeInstanceOf(
      QuestionNotFoundError,
    );
  });

  it('lists questions with pagination metadata', async () => {
    queryBuilder.getCount.mockResolvedValue(1);
    queryBuilder.getMany.mockResolvedValue([activeQuestion]);

    const result = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sort: 'DESC',
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(parishService.getParishById).toHaveBeenCalledWith(parishId);
  });
});
