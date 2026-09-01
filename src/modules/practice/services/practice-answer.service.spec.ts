import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import {
  PracticeAnswerIdempotencyConflictError,
  PracticeQuestionFinalizedError,
  PracticeSessionCompletedError,
} from '../errors/practice.errors';
import { PracticeAccessService } from './practice-access.service';
import { PracticeAnswerService } from './practice-answer.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

function mockDataSourceTransaction(
  dataSource: { transaction: jest.Mock },
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

describe('PracticeAnswerService', () => {
  const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionQuestionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const questionVersionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const enrollmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const actorUserId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const clientAnswerId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const correctOptionId = '11111111-1111-4111-8111-111111111111';
  const wrongOptionId = '22222222-2222-4222-8222-222222222222';

  let practiceAnswerService: PracticeAnswerService;
  let dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };
  let enrollmentService: jest.Mocked<Pick<EnrollmentService, 'getEnrollmentById'>>;
  let questionBankService: jest.Mocked<
    Pick<QuestionBankService, 'gradeAnswer' | 'getPracticeFeedback'>
  >;
  let practiceAccessService: jest.Mocked<
    Pick<PracticeAccessService, 'assertCanManageEnrollmentPractice'>
  >;
  let practiceSessionQueryService: jest.Mocked<
    Pick<PracticeSessionQueryService, 'findSessionEntity' | 'findSessionQuestionEntity'>
  >;
  let attemptRepository: jest.Mocked<
    Pick<Repository<PracticeAnswerAttemptEntity>, 'findOne' | 'find' | 'save'>
  >;
  let sessionQuestionRepository: jest.Mocked<
    Pick<Repository<PracticeSessionQuestionEntity>, 'findOne' | 'find'>
  >;
  let sessionRepository: jest.Mocked<Pick<Repository<PracticeSessionEntity>, 'findOne' | 'save'>>;

  const inProgressSession = {
    id: sessionId,
    enrollmentId,
    status: PracticeSessionStatus.InProgress,
    maxAttemptsPerQuestion: 3,
  } satisfies Partial<PracticeSessionEntity> as PracticeSessionEntity;

  const sessionQuestion = {
    id: sessionQuestionId,
    practiceSessionId: sessionId,
    questionVersionId,
  } satisfies Partial<PracticeSessionQuestionEntity> as PracticeSessionQuestionEntity;

  beforeEach(async () => {
    attemptRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((attempt) => Promise.resolve(attempt)),
    };
    sessionQuestionRepository = {
      findOne: jest.fn().mockResolvedValue(sessionQuestion),
      find: jest.fn().mockResolvedValue([sessionQuestion]),
    };
    sessionRepository = {
      findOne: jest.fn().mockResolvedValue(inProgressSession),
      save: jest.fn().mockImplementation((session) => Promise.resolve(session)),
    };

    const entityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === PracticeSessionQuestionEntity) {
          return sessionQuestionRepository;
        }

        if (entity === PracticeSessionEntity) {
          return sessionRepository;
        }

        if (entity === PracticeAnswerAttemptEntity) {
          return attemptRepository;
        }

        throw new Error(`Unexpected repository entity: ${String(entity)}`);
      }),
    };

    dataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn().mockReturnValue(attemptRepository),
    };
    mockDataSourceTransaction(dataSource, entityManager as unknown as EntityManager);

    enrollmentService = {
      getEnrollmentById: jest.fn().mockResolvedValue({ id: enrollmentId, studentId: 'student-id' }),
    };
    questionBankService = {
      gradeAnswer: jest.fn(),
      getPracticeFeedback: jest.fn().mockResolvedValue({
        questionVersionId,
        explanation: 'Because',
        explanationMediaJson: null,
        correctOptionIds: [correctOptionId],
      }),
    };
    practiceAccessService = {
      assertCanManageEnrollmentPractice: jest.fn().mockResolvedValue(undefined),
    };
    practiceSessionQueryService = {
      findSessionEntity: jest.fn().mockResolvedValue(inProgressSession),
      findSessionQuestionEntity: jest.fn().mockResolvedValue(sessionQuestion),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeAnswerService,
        { provide: DataSource, useValue: dataSource },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: QuestionBankService, useValue: questionBankService },
        { provide: PracticeAccessService, useValue: practiceAccessService },
        { provide: PracticeSessionQueryService, useValue: practiceSessionQueryService },
        {
          provide: getRepositoryToken(PracticeAnswerAttemptEntity),
          useValue: attemptRepository,
        },
      ],
    }).compile();

    practiceAnswerService = moduleRef.get(PracticeAnswerService);
  });

  it('returns replayed result for idempotent clientAnswerId without regrading', async () => {
    const existingAttempt = {
      id: '99999999-9999-4999-8999-999999999999',
      practiceSessionQuestionId: sessionQuestionId,
      attemptNumber: 1,
      clientAnswerId,
      selectedOptionIdsJson: JSON.stringify([correctOptionId]),
      isCorrect: true,
      score: 1,
      submittedAt: new Date(),
    } satisfies Partial<PracticeAnswerAttemptEntity> as PracticeAnswerAttemptEntity;

    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(existingAttempt),
      find: jest.fn().mockResolvedValue([existingAttempt]),
    });
    attemptRepository.find.mockResolvedValue([existingAttempt]);

    const result = await practiceAnswerService.submitAnswer({
      actorUserId,
      sessionId,
      sessionQuestionId,
      clientAnswerId,
      selectedOptionIds: [correctOptionId],
    });

    expect(result.replayed).toBe(true);
    expect(result.isCorrect).toBe(true);
    expect(result.feedback).not.toBeNull();
    expect(questionBankService.gradeAnswer).not.toHaveBeenCalled();
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it('creates first correct attempt with feedback and replayed false', async () => {
    questionBankService.gradeAnswer.mockResolvedValue({
      questionVersionId,
      questionType: 'SINGLE_CHOICE' as never,
      isCorrect: true,
      score: 1,
    });
    sessionQuestionRepository.findOne.mockResolvedValue(sessionQuestion);
    attemptRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await practiceAnswerService.submitAnswer({
      actorUserId,
      sessionId,
      sessionQuestionId,
      clientAnswerId,
      selectedOptionIds: [correctOptionId],
    });

    expect(result.replayed).toBe(false);
    expect(result.questionFinalized).toBe(true);
    expect(result.canRetry).toBe(false);
    expect(result.feedback).toEqual({
      explanation: 'Because',
      explanationMediaJson: null,
      correctOptionIds: [correctOptionId],
    });
    expect(attemptRepository.save).toHaveBeenCalledTimes(1);
  });

  it('returns retry state without feedback for first wrong attempt', async () => {
    questionBankService.gradeAnswer.mockResolvedValue({
      questionVersionId,
      questionType: 'SINGLE_CHOICE' as never,
      isCorrect: false,
      score: 0,
    });

    const result = await practiceAnswerService.submitAnswer({
      actorUserId,
      sessionId,
      sessionQuestionId,
      clientAnswerId,
      selectedOptionIds: [wrongOptionId],
    });

    expect(result.isCorrect).toBe(false);
    expect(result.canRetry).toBe(true);
    expect(result.feedback).toBeNull();
  });

  it('rejects answer submission when question is already finalized', async () => {
    const finalizedAttempt = {
      id: '99999999-9999-4999-8999-999999999999',
      practiceSessionQuestionId: sessionQuestionId,
      attemptNumber: 1,
      clientAnswerId: '88888888-8888-4888-8888-888888888888',
      selectedOptionIdsJson: JSON.stringify([correctOptionId]),
      isCorrect: true,
      score: 1,
      submittedAt: new Date(),
    } satisfies Partial<PracticeAnswerAttemptEntity> as PracticeAnswerAttemptEntity;

    attemptRepository.find.mockResolvedValue([finalizedAttempt]);

    await expect(
      practiceAnswerService.submitAnswer({
        actorUserId,
        sessionId,
        sessionQuestionId,
        clientAnswerId,
        selectedOptionIds: [wrongOptionId],
      }),
    ).rejects.toBeInstanceOf(PracticeQuestionFinalizedError);
  });

  it('rejects answer submission for completed sessions', async () => {
    practiceSessionQueryService.findSessionEntity.mockResolvedValue({
      ...inProgressSession,
      status: PracticeSessionStatus.Completed,
    });

    await expect(
      practiceAnswerService.submitAnswer({
        actorUserId,
        sessionId,
        sessionQuestionId,
        clientAnswerId,
        selectedOptionIds: [correctOptionId],
      }),
    ).rejects.toBeInstanceOf(PracticeSessionCompletedError);
  });

  it('throws idempotency conflict when clientAnswerId is reused with different options', async () => {
    const existingAttempt = {
      id: '99999999-9999-4999-8999-999999999999',
      practiceSessionQuestionId: sessionQuestionId,
      attemptNumber: 1,
      clientAnswerId,
      selectedOptionIdsJson: JSON.stringify([correctOptionId]),
      isCorrect: true,
      score: 1,
      submittedAt: new Date(),
    } satisfies Partial<PracticeAnswerAttemptEntity> as PracticeAnswerAttemptEntity;

    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(existingAttempt),
      find: jest.fn().mockResolvedValue([existingAttempt]),
    });

    await expect(
      practiceAnswerService.submitAnswer({
        actorUserId,
        sessionId,
        sessionQuestionId,
        clientAnswerId,
        selectedOptionIds: [wrongOptionId],
      }),
    ).rejects.toBeInstanceOf(PracticeAnswerIdempotencyConflictError);
  });
});
