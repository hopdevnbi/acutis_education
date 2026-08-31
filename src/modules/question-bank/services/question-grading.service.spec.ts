import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import {
  InvalidGradeAnswerInputError,
  QuestionVersionNotDeliverableError,
  QuestionVersionNotGradableError,
} from '../errors/question-bank.errors';
import { QuestionGradingService } from './question-grading.service';

describe('QuestionGradingService', () => {
  let questionGradingService: QuestionGradingService;
  let questionVersionRepository: jest.Mocked<Pick<Repository<QuestionVersionEntity>, 'findOne'>>;
  let questionRepository: jest.Mocked<Pick<Repository<QuestionEntity>, 'findOne'>>;
  let questionOptionRepository: jest.Mocked<Pick<Repository<QuestionOptionEntity>, 'find'>>;
  let questionCorrectOptionRepository: jest.Mocked<
    Pick<Repository<QuestionCorrectOptionEntity>, 'find'>
  >;

  const questionId = '33333333-3333-4333-8333-333333333333';
  const versionId = '44444444-4444-4444-8444-444444444444';
  const optionAId = '66666666-6666-4666-8666-666666666666';
  const optionBId = '77777777-7777-4777-8777-777777777777';
  const optionCId = '88888888-8888-4888-8888-888888888888';

  const publishedVersion = {
    id: versionId,
    questionId,
    versionNumber: 1,
    status: QuestionVersionStatus.Published,
    questionType: QuestionType.SingleChoice,
    prompt: 'Prompt',
    instruction: null,
    explanation: 'Explanation',
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
  } satisfies QuestionVersionEntity;

  const options = [
    {
      id: optionAId,
      questionVersionId: versionId,
      code: 'a',
      text: 'Option A',
      mediaAssetId: null,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: optionBId,
      questionVersionId: versionId,
      code: 'b',
      text: 'Option B',
      mediaAssetId: null,
      sortOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] satisfies QuestionOptionEntity[];

  beforeEach(async () => {
    questionVersionRepository = {
      findOne: jest.fn().mockResolvedValue(publishedVersion),
    };

    questionRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: questionId,
        parishId: '11111111-1111-4111-8111-111111111111',
        code: 'q1',
        status: 'ACTIVE',
        sourceLocale: 'vi-VN',
        currentPublishedVersionId: versionId,
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    questionOptionRepository = {
      find: jest.fn().mockResolvedValue(options),
    };

    questionCorrectOptionRepository = {
      find: jest.fn().mockResolvedValue([{ questionVersionId: versionId, optionId: optionAId }]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionGradingService,
        { provide: getRepositoryToken(QuestionVersionEntity), useValue: questionVersionRepository },
        { provide: getRepositoryToken(QuestionEntity), useValue: questionRepository },
        { provide: getRepositoryToken(QuestionOptionEntity), useValue: questionOptionRepository },
        {
          provide: getRepositoryToken(QuestionCorrectOptionEntity),
          useValue: questionCorrectOptionRepository,
        },
      ],
    }).compile();

    questionGradingService = moduleRef.get(QuestionGradingService);
  });

  it('returns learner projection without answer leakage fields', async () => {
    const projection = await questionGradingService.getLearnerQuestionProjection(versionId);

    expect(projection.questionVersionId).toBe(versionId);
    expect(projection.options).toHaveLength(2);
    expect(projection.options[0]).not.toHaveProperty('code');
    expect(projection).not.toHaveProperty('correctOptionIds');
    expect(projection).not.toHaveProperty('answerDefinitionJson');
    expect(projection).not.toHaveProperty('explanation');
    expect(projection).not.toHaveProperty('createdByUserId');
    expect(projection).not.toHaveProperty('publishedByUserId');
    expect(projection).not.toHaveProperty('explanationMediaJson');
  });

  it('rejects learner projection for draft versions', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      status: QuestionVersionStatus.Draft,
    });

    await expect(
      questionGradingService.getLearnerQuestionProjection(versionId),
    ).rejects.toBeInstanceOf(QuestionVersionNotDeliverableError);
  });

  it('allows author preview for draft versions without answer leakage', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      status: QuestionVersionStatus.Draft,
    });

    const preview = await questionGradingService.getQuestionVersionPreview(versionId);

    expect(preview.questionVersionId).toBe(versionId);
    expect(preview).not.toHaveProperty('correctOptionIds');
    expect(preview).not.toHaveProperty('explanation');
    expect(preview.options[0]).not.toHaveProperty('code');
  });

  it('grades single-choice answers as correct or incorrect', async () => {
    const correct = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionAId],
    });

    expect(correct.isCorrect).toBe(true);
    expect(correct.score).toBe(1);

    const incorrect = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionBId],
    });

    expect(incorrect.isCorrect).toBe(false);
    expect(incorrect.score).toBe(0);
  });

  it('rejects invalid single-choice selection counts', async () => {
    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: [],
      }),
    ).rejects.toBeInstanceOf(InvalidGradeAnswerInputError);

    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: [optionAId, optionBId],
      }),
    ).rejects.toBeInstanceOf(InvalidGradeAnswerInputError);
  });

  it('grades multiple-choice answers with exact-set semantics', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      questionType: QuestionType.MultipleChoice,
    });
    questionCorrectOptionRepository.find.mockResolvedValue([
      { questionVersionId: versionId, optionId: optionAId },
      { questionVersionId: versionId, optionId: optionBId },
    ]);
    questionOptionRepository.find.mockResolvedValue([
      ...options,
      {
        id: optionCId,
        questionVersionId: versionId,
        code: 'c',
        text: 'Option C',
        mediaAssetId: null,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const correct = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionBId, optionAId],
    });
    expect(correct.isCorrect).toBe(true);

    const subset = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionAId],
    });
    expect(subset.isCorrect).toBe(false);

    const superset = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionAId, optionBId, optionCId],
    });
    expect(superset.isCorrect).toBe(false);
  });

  it('rejects duplicate and unknown option ids', async () => {
    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: [optionAId, optionAId],
      }),
    ).rejects.toBeInstanceOf(InvalidGradeAnswerInputError);

    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: ['99999999-9999-4999-8999-999999999999'],
      }),
    ).rejects.toBeInstanceOf(InvalidGradeAnswerInputError);
  });

  it('rejects options from another version', async () => {
    questionOptionRepository.find.mockResolvedValue([
      {
        id: optionBId,
        questionVersionId: versionId,
        code: 'b',
        text: 'Option B',
        mediaAssetId: null,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: [optionAId],
      }),
    ).rejects.toBeInstanceOf(InvalidGradeAnswerInputError);
  });

  it('rejects grading draft versions', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      status: QuestionVersionStatus.Draft,
    });

    await expect(
      questionGradingService.gradeAnswer({
        questionVersionId: versionId,
        selectedOptionIds: [optionAId],
      }),
    ).rejects.toBeInstanceOf(QuestionVersionNotGradableError);
  });

  it('allows grading archived versions', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      status: QuestionVersionStatus.Archived,
    });

    const result = await questionGradingService.gradeAnswer({
      questionVersionId: versionId,
      selectedOptionIds: [optionAId],
    });

    expect(result.isCorrect).toBe(true);
  });

  it('returns immutable assessment snapshot for published versions', async () => {
    const snapshot = await questionGradingService.getImmutableAssessmentSnapshot(versionId);

    expect(snapshot.questionVersionId).toBe(versionId);
    expect(snapshot.sourceLocale).toBe('vi-VN');
    expect(snapshot.correctOptionIds).toEqual([optionAId]);
    expect(snapshot).not.toHaveProperty('createdByUserId');
    expect(snapshot).not.toHaveProperty('publishedByUserId');
  });

  it('rejects immutable assessment snapshot for draft versions', async () => {
    questionVersionRepository.findOne.mockResolvedValue({
      ...publishedVersion,
      status: QuestionVersionStatus.Draft,
    });

    await expect(
      questionGradingService.getImmutableAssessmentSnapshot(versionId),
    ).rejects.toBeInstanceOf(QuestionVersionNotGradableError);
  });
});
