import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { CurriculumStatus } from '../../curriculum/enums/curriculum-status.enum';
import { CurriculumInactiveError } from '../../curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import {
  QuestionCurriculumLinkAlreadyExistsError,
  QuestionCurriculumLinkNotFoundError,
  QuestionCurriculumParishMismatchError,
} from '../errors/question-bank.errors';
import { QuestionCurriculumLinkService } from './question-curriculum-link.service';

describe('QuestionCurriculumLinkService', () => {
  let questionCurriculumLinkService: QuestionCurriculumLinkService;
  let questionCurriculumLinkRepository: jest.Mocked<
    Pick<
      Repository<QuestionCurriculumLinkEntity>,
      'create' | 'save' | 'findOne' | 'delete' | 'find'
    >
  >;
  let questionRepository: jest.Mocked<Pick<Repository<QuestionEntity>, 'findOne'>>;
  let curriculumService: jest.Mocked<
    Pick<
      CurriculumService,
      | 'getCurriculumById'
      | 'assertCurriculumActiveById'
      | 'assertCanonicalLessonKeyBelongsToCurriculum'
      | 'assertVersionBelongsToCurriculum'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const otherParishId = '22222222-2222-4222-8222-222222222222';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const curriculumId = '44444444-4444-4444-8444-444444444444';
  const linkId = '77777777-7777-4777-8777-777777777777';

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
    questionCurriculumLinkRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    questionRepository = {
      findOne: jest.fn(),
    };

    curriculumService = {
      getCurriculumById: jest.fn().mockResolvedValue({
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
      }),
      assertCurriculumActiveById: jest.fn().mockResolvedValue(undefined),
      assertCanonicalLessonKeyBelongsToCurriculum: jest.fn().mockResolvedValue(undefined),
      assertVersionBelongsToCurriculum: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionCurriculumLinkService,
        {
          provide: getRepositoryToken(QuestionCurriculumLinkEntity),
          useValue: questionCurriculumLinkRepository,
        },
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: CurriculumService, useValue: curriculumService },
      ],
    }).compile();

    questionCurriculumLinkService = moduleRef.get(QuestionCurriculumLinkService);
  });

  it('creates a curriculum link for a question', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionCurriculumLinkRepository.findOne.mockResolvedValue(null);

    const savedLink = {
      id: linkId,
      questionId,
      parishId,
      curriculumId,
      canonicalLessonKey: null,
      authoringCurriculumVersionId: null,
      createdAt: new Date(),
    } satisfies QuestionCurriculumLinkEntity;

    questionCurriculumLinkRepository.create.mockReturnValue(savedLink);
    questionCurriculumLinkRepository.save.mockResolvedValue(savedLink);

    const snapshot = await questionCurriculumLinkService.createLink(questionId, {
      curriculumId,
    });

    expect(snapshot.curriculumId).toBe(curriculumId);
    expect(snapshot.questionId).toBe(questionId);
    expect(curriculumService.assertCurriculumActiveById).toHaveBeenCalledWith(curriculumId);
  });

  it('rejects new curriculum links when curriculum is inactive', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    curriculumService.assertCurriculumActiveById.mockRejectedValue(new CurriculumInactiveError());

    await expect(
      questionCurriculumLinkService.createLink(questionId, { curriculumId }),
    ).rejects.toBeInstanceOf(CurriculumInactiveError);
  });

  it('lists historical curriculum links even when curriculum becomes inactive', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionCurriculumLinkRepository.find.mockResolvedValue([
      {
        id: linkId,
        questionId,
        parishId,
        curriculumId,
        canonicalLessonKey: null,
        authoringCurriculumVersionId: null,
        createdAt: new Date(),
      },
    ]);

    const links = await questionCurriculumLinkService.listLinksByQuestion(questionId);

    expect(links).toHaveLength(1);
    expect(links[0]?.curriculumId).toBe(curriculumId);
    expect(curriculumService.assertCurriculumActiveById).not.toHaveBeenCalled();
  });

  it('rejects curriculum links when parishes do not match', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    curriculumService.getCurriculumById.mockResolvedValue({
      id: curriculumId,
      parishId: otherParishId,
      catechismLevelId: '88888888-8888-4888-8888-888888888888',
      code: 'khai-tam',
      name: 'Khai Tam',
      description: null,
      status: CurriculumStatus.Active,
      sourceLocale: 'vi-VN',
      currentPublishedVersionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      questionCurriculumLinkService.createLink(questionId, { curriculumId }),
    ).rejects.toBeInstanceOf(QuestionCurriculumParishMismatchError);
  });

  it('rejects duplicate curriculum links', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionCurriculumLinkRepository.findOne.mockResolvedValue({
      id: linkId,
      questionId,
      parishId,
      curriculumId,
      canonicalLessonKey: null,
      authoringCurriculumVersionId: null,
      createdAt: new Date(),
    });

    await expect(
      questionCurriculumLinkService.createLink(questionId, { curriculumId }),
    ).rejects.toBeInstanceOf(QuestionCurriculumLinkAlreadyExistsError);
  });

  it('maps unique constraint violations to QuestionCurriculumLinkAlreadyExistsError', async () => {
    questionRepository.findOne.mockResolvedValue(activeQuestion);
    questionCurriculumLinkRepository.findOne.mockResolvedValue(null);
    questionCurriculumLinkRepository.create.mockReturnValue({
      id: linkId,
      questionId,
      parishId,
      curriculumId,
      canonicalLessonKey: null,
      authoringCurriculumVersionId: null,
      createdAt: new Date(),
    });
    questionCurriculumLinkRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      questionCurriculumLinkService.createLink(questionId, { curriculumId }),
    ).rejects.toBeInstanceOf(QuestionCurriculumLinkAlreadyExistsError);
  });

  it('throws QuestionCurriculumLinkNotFoundError when deleting a missing link', async () => {
    questionCurriculumLinkRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

    await expect(questionCurriculumLinkService.deleteLink(linkId)).rejects.toBeInstanceOf(
      QuestionCurriculumLinkNotFoundError,
    );
  });
});
