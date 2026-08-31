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
import { MediaAssetService } from '../../media/services/media-asset.service';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  InvalidQuestionSourceLocaleError,
  QuestionCodeAlreadyExistsError,
  QuestionDraftAlreadyExistsError,
  QuestionInactiveError,
  QuestionNoPublishedVersionError,
  QuestionNotFoundError,
  QuestionSourceLocaleImmutableError,
  QuestionTypeChangeNotAllowedError,
  QuestionUpdateRequiresFieldsError,
  QuestionVersionNotCloneableError,
  QuestionVersionNotDraftError,
  QuestionPublishValidationError,
  QuestionListFilterRequiresCurriculumIdError,
} from '../errors/question-bank.errors';
import { QuestionBankService } from './question-bank.service';
import { QuestionExportService } from './question-export.service';
import { QuestionGradingService } from './question-grading.service';
import { QuestionImportValidationService } from './question-import-validation.service';
import { QuestionOptionService } from './question-option.service';
import { QuestionPracticeSelectionService } from './question-practice-selection.service';

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
    Pick<
      Repository<QuestionVersionEntity>,
      'findOne' | 'count' | 'save' | 'manager' | 'find' | 'createQueryBuilder'
    >
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let questionOptionService: jest.Mocked<
    Pick<
      QuestionOptionService,
      | 'ensureTrueFalseOptions'
      | 'recomputeSourceContentHash'
      | 'listOptionsByVersion'
      | 'getCorrectOptionIdsByVersion'
    >
  >;
  let questionGradingService: jest.Mocked<
    Pick<
      QuestionGradingService,
      | 'getLearnerQuestionProjection'
      | 'getLearnerQuestionProjections'
      | 'getQuestionVersionPreview'
      | 'gradeAnswer'
      | 'getImmutableAssessmentSnapshot'
    >
  >;
  let mediaAssetService: jest.Mocked<Pick<MediaAssetService, 'assertAssetCategory'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<QuestionEntity>,
      | 'where'
      | 'andWhere'
      | 'orderBy'
      | 'skip'
      | 'take'
      | 'getCount'
      | 'getMany'
      | 'leftJoin'
      | 'innerJoin'
      | 'distinct'
      | 'clone'
      | 'select'
      | 'getRawOne'
    >
  >;
  let versionQueryBuilder: jest.Mocked<
    Pick<SelectQueryBuilder<QuestionVersionEntity>, 'where' | 'andWhere' | 'getMany'>
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
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      clone: jest.fn(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: 0 }),
    };
    queryBuilder.clone.mockReturnValue(
      queryBuilder as unknown as SelectQueryBuilder<QuestionEntity>,
    );

    versionQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
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
      manager: {} as EntityManager,
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(versionQueryBuilder),
    };

    questionOptionService = {
      ensureTrueFalseOptions: jest.fn().mockResolvedValue(undefined),
      recomputeSourceContentHash: jest.fn().mockResolvedValue('hash'),
      listOptionsByVersion: jest.fn().mockResolvedValue([]),
      getCorrectOptionIdsByVersion: jest.fn().mockResolvedValue([]),
    };

    questionGradingService = {
      getLearnerQuestionProjection: jest.fn(),
      getLearnerQuestionProjections: jest.fn(),
      getQuestionVersionPreview: jest.fn(),
      gradeAnswer: jest.fn(),
      getImmutableAssessmentSnapshot: jest.fn(),
    };

    mediaAssetService = {
      assertAssetCategory: jest.fn().mockResolvedValue({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        mediaCategory: 'IMAGE',
      }),
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
        { provide: QuestionOptionService, useValue: questionOptionService },
        { provide: QuestionGradingService, useValue: questionGradingService },
        { provide: MediaAssetService, useValue: mediaAssetService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: QuestionExportService,
          useValue: { buildExportPackage: jest.fn() },
        },
        {
          provide: QuestionImportValidationService,
          useValue: { validate: jest.fn() },
        },
        {
          provide: QuestionPracticeSelectionService,
          useValue: { selectCurrentPublishedQuestionsForPractice: jest.fn() },
        },
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
      findOne: jest.fn().mockResolvedValue(savedVersion),
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

  it('lists questions with pagination metadata and version summaries', async () => {
    queryBuilder.getCount.mockResolvedValue(1);
    queryBuilder.getMany.mockResolvedValue([activeQuestion]);
    versionQueryBuilder.getMany.mockResolvedValue([
      {
        id: versionId,
        questionId,
        versionNumber: 1,
        status: QuestionVersionStatus.Draft,
        questionType: QuestionType.SingleChoice,
        prompt: 'Draft prompt',
        instruction: null,
        explanation: null,
        promptMediaJson: null,
        explanationMediaJson: null,
        answerDefinitionJson: null,
        difficulty: QuestionDifficulty.Easy,
        sourceContentHash: null,
        createdByUserId: userId,
        publishedByUserId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sort: 'DESC',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.hasDraft).toBe(true);
    expect(result.items[0]?.hasPublished).toBe(false);
    expect(result.items[0]?.currentDraftVersion?.questionType).toBe(QuestionType.SingleChoice);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(parishService.getParishById).toHaveBeenCalledWith(parishId);
  });

  it('applies effective-version search filters with distinct joins', async () => {
    queryBuilder.getRawOne.mockResolvedValue({ count: 2 });
    queryBuilder.getMany.mockResolvedValue([activeQuestion]);

    await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sort: 'DESC',
      search: 'Bí tích',
      questionType: QuestionType.SingleChoice,
      difficulty: QuestionDifficulty.Easy,
      hasDraft: true,
    });

    expect(queryBuilder.leftJoin).toHaveBeenCalled();
    expect(queryBuilder.distinct).toHaveBeenCalledWith(true);
    expect(queryBuilder.andWhere).toHaveBeenCalled();
  });

  it('rejects canonicalLessonKey filter without curriculumId', async () => {
    await expect(
      questionBankService.listQuestionsByParish(parishId, {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sort: 'DESC',
        canonicalLessonKey: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      }),
    ).rejects.toBeInstanceOf(QuestionListFilterRequiresCurriculumIdError);
  });

  it('collects publish validation issues for incomplete draft versions', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Draft,
      questionType: QuestionType.SingleChoice,
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
    });

    questionOptionService.listOptionsByVersion.mockResolvedValue([]);
    questionOptionService.getCorrectOptionIdsByVersion.mockResolvedValue([]);

    const issues = await questionBankService.collectPublishValidationIssues(versionId);

    expect(issues.some((issue) => issue.code === 'PROMPT_REQUIRED')).toBe(true);
    expect(issues.some((issue) => issue.code === 'DIFFICULTY_REQUIRED')).toBe(true);
    expect(issues.some((issue) => issue.code === 'INVALID_OPTION_COUNT')).toBe(true);
    expect(issues.some((issue) => issue.code === 'CORRECT_ANSWER_REQUIRED')).toBe(true);
  });

  it('publishes a valid draft version and archives the previous published version', async () => {
    const optionId = '66666666-6666-4666-8666-666666666666';
    const previousPublishedVersionId = '77777777-7777-4777-8777-777777777777';

    questionOptionService.listOptionsByVersion.mockResolvedValue([
      {
        id: optionId,
        questionVersionId: versionId,
        code: 'a',
        text: 'Option A',
        mediaAssetId: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        questionVersionId: versionId,
        code: 'b',
        text: 'Option B',
        mediaAssetId: null,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    questionOptionService.getCorrectOptionIdsByVersion.mockResolvedValue([optionId]);

    questionVersionRepository.findOne
      .mockResolvedValueOnce({
        id: versionId,
        questionId,
        versionNumber: 2,
        status: QuestionVersionStatus.Draft,
        questionType: QuestionType.SingleChoice,
        prompt: 'Ready prompt',
        instruction: null,
        explanation: null,
        promptMediaJson: null,
        explanationMediaJson: null,
        answerDefinitionJson: null,
        difficulty: QuestionDifficulty.Easy,
        sourceContentHash: null,
        createdByUserId: userId,
        publishedByUserId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: versionId,
        questionId,
        versionNumber: 2,
        status: QuestionVersionStatus.Published,
        questionType: QuestionType.SingleChoice,
        prompt: 'Ready prompt',
        instruction: null,
        explanation: null,
        promptMediaJson: null,
        explanationMediaJson: null,
        answerDefinitionJson: null,
        difficulty: QuestionDifficulty.Easy,
        sourceContentHash: 'hash',
        createdByUserId: userId,
        publishedByUserId: userId,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const previousPublishedVersion = {
      id: previousPublishedVersionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Published,
      questionType: QuestionType.SingleChoice,
      prompt: 'Old',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: QuestionDifficulty.Easy,
      sourceContentHash: 'old-hash',
      createdByUserId: userId,
      publishedByUserId: userId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const draftVersion = {
      id: versionId,
      questionId,
      versionNumber: 2,
      status: QuestionVersionStatus.Draft,
      questionType: QuestionType.SingleChoice,
      prompt: 'Ready prompt',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: QuestionDifficulty.Easy,
      sourceContentHash: null,
      createdByUserId: userId,
      publishedByUserId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const question = {
      ...activeQuestion,
      currentPublishedVersionId: previousPublishedVersionId,
    };

    const saveMock = jest.fn().mockImplementation((value: unknown) => Promise.resolve(value));

    const entityManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(draftVersion)
        .mockResolvedValueOnce(question)
        .mockResolvedValueOnce(previousPublishedVersion),
      save: saveMock,
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);
    questionOptionService.recomputeSourceContentHash.mockResolvedValue('hash');

    const snapshot = await questionBankService.publishDraftVersion(versionId, userId);

    expect(snapshot.status).toBe(QuestionVersionStatus.Published);
    expect(snapshot.sourceContentHash).toBe('hash');
    expect(saveMock).toHaveBeenCalled();
  });

  it('rejects publish when validation issues remain', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Draft,
      questionType: QuestionType.SingleChoice,
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
    });

    questionOptionService.listOptionsByVersion.mockResolvedValue([]);
    questionOptionService.getCorrectOptionIdsByVersion.mockResolvedValue([]);

    await expect(questionBankService.publishDraftVersion(versionId, userId)).rejects.toBeInstanceOf(
      QuestionPublishValidationError,
    );
  });

  it('rejects question type change when options already exist', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
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
      createdByUserId: userId,
      publishedByUserId: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionOptionService.listOptionsByVersion.mockResolvedValue([
      {
        id: '66666666-6666-4666-8666-666666666666',
        questionVersionId: versionId,
        code: 'a',
        text: 'Option A',
        mediaAssetId: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    questionOptionService.getCorrectOptionIdsByVersion.mockResolvedValue([]);

    await expect(
      questionBankService.updateDraftVersion(versionId, { questionType: QuestionType.TrueFalse }),
    ).rejects.toBeInstanceOf(QuestionTypeChangeNotAllowedError);
  });

  it('rejects cloning a draft source version', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValue({
        id: versionId,
        questionId,
        versionNumber: 1,
        status: QuestionVersionStatus.Draft,
        questionType: QuestionType.SingleChoice,
        prompt: 'Draft',
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
      }),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(questionBankService.cloneVersionToDraft(versionId, userId)).rejects.toBeInstanceOf(
      QuestionVersionNotCloneableError,
    );
  });

  it('rejects cloning when question root is inactive', async () => {
    const entityManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: versionId,
          questionId,
          versionNumber: 1,
          status: QuestionVersionStatus.Published,
          questionType: QuestionType.SingleChoice,
          prompt: 'Published',
          instruction: null,
          explanation: null,
          promptMediaJson: null,
          explanationMediaJson: null,
          answerDefinitionJson: null,
          difficulty: QuestionDifficulty.Easy,
          sourceContentHash: 'hash',
          createdByUserId: userId,
          publishedByUserId: userId,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          ...activeQuestion,
          status: QuestionStatus.Inactive,
        }),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(questionBankService.cloneVersionToDraft(versionId, userId)).rejects.toBeInstanceOf(
      QuestionInactiveError,
    );
  });

  it('rejects cloning when a draft already exists', async () => {
    const entityManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: versionId,
          questionId,
          versionNumber: 1,
          status: QuestionVersionStatus.Published,
          questionType: QuestionType.SingleChoice,
          prompt: 'Published',
          instruction: null,
          explanation: null,
          promptMediaJson: null,
          explanationMediaJson: null,
          answerDefinitionJson: null,
          difficulty: QuestionDifficulty.Easy,
          sourceContentHash: 'hash',
          createdByUserId: userId,
          publishedByUserId: userId,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(activeQuestion)
        .mockResolvedValueOnce({
          id: '99999999-9999-4999-8999-999999999999',
          questionId,
          versionNumber: 2,
          status: QuestionVersionStatus.Draft,
          questionType: QuestionType.SingleChoice,
          prompt: 'Draft',
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
        }),
      createQueryBuilder: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(questionBankService.cloneVersionToDraft(versionId, userId)).rejects.toBeInstanceOf(
      QuestionDraftAlreadyExistsError,
    );
  });

  it('returns current published question selection snapshot', async () => {
    questionRepository.findOne.mockResolvedValue({
      ...activeQuestion,
      currentPublishedVersionId: versionId,
    });
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Published,
      questionType: QuestionType.SingleChoice,
      prompt: 'Published',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: QuestionDifficulty.Easy,
      sourceContentHash: 'hash-123',
      createdByUserId: userId,
      publishedByUserId: userId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const snapshot = await questionBankService.getCurrentPublishedQuestionForSelection(questionId);

    expect(snapshot.questionId).toBe(questionId);
    expect(snapshot.questionVersionId).toBe(versionId);
    expect(snapshot.questionType).toBe(QuestionType.SingleChoice);
    expect(snapshot.sourceLocale).toBe('vi-VN');
    expect(snapshot.sourceContentHash).toBe('hash-123');
  });

  it('rejects current published selection when question is inactive', async () => {
    questionRepository.findOne.mockResolvedValue({
      ...activeQuestion,
      status: QuestionStatus.Inactive,
    });

    await expect(
      questionBankService.getCurrentPublishedQuestionForSelection(questionId),
    ).rejects.toBeInstanceOf(QuestionInactiveError);
  });

  it('rejects current published selection when no published version exists', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);

    await expect(
      questionBankService.getCurrentPublishedQuestionForSelection(questionId),
    ).rejects.toBeInstanceOf(QuestionNoPublishedVersionError);
  });

  it('rejects current published selection when current pointer is not published', async () => {
    questionRepository.findOne.mockResolvedValue({
      ...activeQuestion,
      currentPublishedVersionId: versionId,
    });
    questionVersionRepository.findOne.mockResolvedValue({
      id: versionId,
      questionId,
      versionNumber: 1,
      status: QuestionVersionStatus.Archived,
      questionType: QuestionType.SingleChoice,
      prompt: 'Archived',
      instruction: null,
      explanation: null,
      promptMediaJson: null,
      explanationMediaJson: null,
      answerDefinitionJson: null,
      difficulty: QuestionDifficulty.Easy,
      sourceContentHash: 'hash-123',
      createdByUserId: userId,
      publishedByUserId: userId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      questionBankService.getCurrentPublishedQuestionForSelection(questionId),
    ).rejects.toBeInstanceOf(QuestionNoPublishedVersionError);
  });
});
