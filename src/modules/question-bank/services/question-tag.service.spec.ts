import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository, type SelectQueryBuilder } from 'typeorm';
import { ParishService } from '../../parish/services/parish.service';
import { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionTagStatus } from '../enums/question-tag-status.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import {
  QuestionTagCodeAlreadyExistsError,
  QuestionTagLinkAlreadyExistsError,
  QuestionTagNotFoundError,
  QuestionUpdateRequiresFieldsError,
} from '../errors/question-bank.errors';
import { QuestionTagService } from './question-tag.service';

describe('QuestionTagService', () => {
  let questionTagService: QuestionTagService;
  let questionTagRepository: jest.Mocked<
    Pick<Repository<QuestionTagEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let questionTagLinkRepository: jest.Mocked<
    Pick<Repository<QuestionTagLinkEntity>, 'findOne' | 'create' | 'save' | 'delete'>
  >;
  let questionRepository: jest.Mocked<Pick<Repository<QuestionEntity>, 'findOne'>>;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<QuestionTagEntity>,
      'where' | 'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const tagId = '66666666-6666-4666-8666-666666666666';

  const parishSnapshot = {
    id: parishId,
    code: 'parish',
    name: 'Parish',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeTag = {
    id: tagId,
    parishId,
    code: 'sacraments',
    name: 'Bí tích',
    status: QuestionTagStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies QuestionTagEntity;

  const activeQuestion = {
    id: questionId,
    parishId,
    code: 'baptism-basics',
    status: QuestionStatus.Active,
    sourceLocale: 'vi-VN',
    currentPublishedVersionId: null,
    createdByUserId: null,
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

    questionTagRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    questionTagLinkRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    questionRepository = {
      findOne: jest.fn(),
    };

    parishService = {
      assertParishActive: jest.fn().mockResolvedValue(parishSnapshot),
      getParishById: jest.fn().mockResolvedValue(parishSnapshot),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionTagService,
        { provide: getRepositoryToken(QuestionTagEntity), useValue: questionTagRepository },
        { provide: getRepositoryToken(QuestionTagLinkEntity), useValue: questionTagLinkRepository },
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: ParishService, useValue: parishService },
      ],
    }).compile();

    questionTagService = moduleRef.get(QuestionTagService);
  });

  it('creates a tag with normalized code', async () => {
    const savedTag = { ...activeTag, code: 'sacraments' } satisfies QuestionTagEntity;
    questionTagRepository.create.mockReturnValue(savedTag);
    questionTagRepository.save.mockResolvedValue(savedTag);

    const snapshot = await questionTagService.createTag(parishId, {
      code: '  Sacraments  ',
      name: '  Bí tích  ',
    });

    expect(snapshot.code).toBe('sacraments');
    expect(snapshot.name).toBe('Bí tích');
    expect(snapshot.status).toBe(QuestionTagStatus.Active);
  });

  it('maps duplicate tag code to QuestionTagCodeAlreadyExistsError', async () => {
    questionTagRepository.create.mockReturnValue(activeTag);
    questionTagRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      questionTagService.createTag(parishId, { code: 'sacraments', name: 'Duplicate' }),
    ).rejects.toBeInstanceOf(QuestionTagCodeAlreadyExistsError);
  });

  it('rejects tag updates when no fields are provided', async () => {
    await expect(questionTagService.updateTag(tagId, {})).rejects.toBeInstanceOf(
      QuestionUpdateRequiresFieldsError,
    );
  });

  it('links a tag to a question', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionTagRepository.findOne.mockResolvedValue(activeTag);
    questionTagLinkRepository.findOne.mockResolvedValue(null);
    questionTagLinkRepository.create.mockReturnValue({
      questionId,
      tagId,
    });
    questionTagLinkRepository.save.mockResolvedValue({ questionId, tagId });

    const snapshot = await questionTagService.linkTag(questionId, tagId);

    expect(snapshot.questionId).toBe(questionId);
    expect(snapshot.tagId).toBe(tagId);
  });

  it('rejects duplicate tag links', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionTagRepository.findOne.mockResolvedValue(activeTag);
    questionTagLinkRepository.findOne.mockResolvedValue({ questionId, tagId });

    await expect(questionTagService.linkTag(questionId, tagId)).rejects.toBeInstanceOf(
      QuestionTagLinkAlreadyExistsError,
    );
  });

  it('throws QuestionTagNotFoundError when tag is missing', async () => {
    questionTagRepository.findOne.mockResolvedValue(null);

    await expect(questionTagService.getTagById(tagId)).rejects.toBeInstanceOf(
      QuestionTagNotFoundError,
    );
  });
});
