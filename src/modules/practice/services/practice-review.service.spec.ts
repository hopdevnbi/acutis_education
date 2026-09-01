import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';
import {
  PracticeNoWrongQuestionsError,
  PracticeReviewSourceNotCompletedError,
} from '../errors/practice.errors';
import { PracticeAccessService } from './practice-access.service';
import { PracticeReviewService } from './practice-review.service';
import { PracticeSessionQueryService } from './practice-session-query.service';
import { computePracticeReviewWrongRequestHash } from '../utils/practice-generation-request-hash.util';

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

describe('PracticeReviewService', () => {
  const sourceSessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const enrollmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const actorUserId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const clientRequestId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const sessionQuestionId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const questionVersionId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  let practiceReviewService: PracticeReviewService;
  let dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };
  let practiceSessionQueryService: jest.Mocked<
    Pick<
      PracticeSessionQueryService,
      'findSessionEntity' | 'findExistingSessionByClientRequestId' | 'getSessionSnapshot'
    >
  >;
  let sessionRepository: jest.Mocked<Pick<Repository<PracticeSessionEntity>, 'save'>>;
  let sessionQuestionRepository: jest.Mocked<
    Pick<Repository<PracticeSessionQuestionEntity>, 'save' | 'find'>
  >;
  let attemptRepository: jest.Mocked<Pick<Repository<PracticeAnswerAttemptEntity>, 'find'>>;

  const completedSourceSession = {
    id: sourceSessionId,
    enrollmentId,
    status: PracticeSessionStatus.Completed,
    locale: 'vi-VN',
    curriculumId: null,
    canonicalLessonKey: null,
    maxAttemptsPerQuestion: 3,
  } satisfies Partial<PracticeSessionEntity> as PracticeSessionEntity;

  beforeEach(async () => {
    sessionRepository = {
      save: jest.fn().mockImplementation((session) => Promise.resolve(session)),
    };
    sessionQuestionRepository = {
      save: jest.fn().mockImplementation((question) => Promise.resolve(question)),
      find: jest.fn().mockResolvedValue([
        {
          id: sessionQuestionId,
          practiceSessionId: sourceSessionId,
          questionVersionId,
          position: 1,
          deliveredOptionOrderJson: JSON.stringify(['11111111-1111-4111-8111-111111111111']),
        },
      ]),
    };
    attemptRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: '99999999-9999-4999-8999-999999999999',
          practiceSessionQuestionId: sessionQuestionId,
          attemptNumber: 1,
          clientAnswerId: '88888888-8888-4888-8888-888888888888',
          selectedOptionIdsJson: JSON.stringify(['22222222-2222-4222-8222-222222222222']),
          isCorrect: false,
          score: 0,
          submittedAt: new Date(),
        },
        {
          id: '77777777-7777-4777-8777-777777777777',
          practiceSessionQuestionId: sessionQuestionId,
          attemptNumber: 2,
          clientAnswerId: '66666666-6666-4666-8666-666666666666',
          selectedOptionIdsJson: JSON.stringify(['22222222-2222-4222-8222-222222222222']),
          isCorrect: false,
          score: 0,
          submittedAt: new Date(),
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          practiceSessionQuestionId: sessionQuestionId,
          attemptNumber: 3,
          clientAnswerId: '44444444-4444-4444-8444-444444444444',
          selectedOptionIdsJson: JSON.stringify(['22222222-2222-4222-8222-222222222222']),
          isCorrect: false,
          score: 0,
          submittedAt: new Date(),
        },
      ]),
    };

    const entityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === PracticeSessionEntity) {
          return sessionRepository;
        }

        if (entity === PracticeSessionQuestionEntity) {
          return sessionQuestionRepository;
        }

        throw new Error(`Unexpected repository entity: ${String(entity)}`);
      }),
    };

    dataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn((entity) => {
        if (entity === PracticeSessionQuestionEntity) {
          return sessionQuestionRepository;
        }

        if (entity === PracticeAnswerAttemptEntity) {
          return attemptRepository;
        }

        throw new Error('Unexpected repository entity.');
      }),
    };
    mockDataSourceTransaction(dataSource, entityManager as unknown as EntityManager);

    practiceSessionQueryService = {
      findSessionEntity: jest.fn().mockResolvedValue(completedSourceSession),
      findExistingSessionByClientRequestId: jest.fn().mockResolvedValue(null),
      getSessionSnapshot: jest.fn().mockResolvedValue({
        id: '12121212-1212-4121-8121-121212121212',
        enrollmentId,
        sessionType: PracticeSessionType.ReviewWrong,
        status: PracticeSessionStatus.InProgress,
        locale: 'vi-VN',
        curriculumId: null,
        canonicalLessonKey: null,
        requestedQuestionCount: 1,
        maxAttemptsPerQuestion: 3,
        randomizeQuestions: false,
        randomizeOptions: false,
        startedAt: new Date(),
        completedAt: null,
        abandonedAt: null,
        questions: [],
        summary: {
          totalQuestions: 1,
          answeredQuestionCount: 0,
          finalizedQuestionCount: 0,
          finalCorrectCount: 0,
          sessionCompleted: false,
        },
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeReviewService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: EnrollmentService,
          useValue: {
            getEnrollmentById: jest
              .fn()
              .mockResolvedValue({ id: enrollmentId, studentId: 'student-id' }),
          },
        },
        {
          provide: PracticeAccessService,
          useValue: {
            assertCanManageEnrollmentPractice: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: PracticeSessionQueryService, useValue: practiceSessionQueryService },
      ],
    }).compile();

    practiceReviewService = moduleRef.get(PracticeReviewService);
  });

  it('creates a review-wrong child session for finally incorrect questions', async () => {
    const result = await practiceReviewService.createReviewWrongSession({
      sourceSessionId,
      actorUserId,
      clientRequestId,
    });

    expect(result.replayed).toBe(false);
    expect(sessionRepository.save).toHaveBeenCalledTimes(1);
    expect(sessionQuestionRepository.save).toHaveBeenCalledTimes(1);
    expect(result.snapshot.sessionType).toBe(PracticeSessionType.ReviewWrong);
  });

  it('replays existing review session for same clientRequestId', async () => {
    practiceSessionQueryService.findExistingSessionByClientRequestId.mockResolvedValue({
      id: '12121212-1212-4121-8121-121212121212',
      enrollmentId,
      sessionType: PracticeSessionType.ReviewWrong,
      sourceSessionId,
      generationRequestHash: computePracticeReviewWrongRequestHash(sourceSessionId),
    } as PracticeSessionEntity);

    const result = await practiceReviewService.createReviewWrongSession({
      sourceSessionId,
      actorUserId,
      clientRequestId,
    });

    expect(result.replayed).toBe(true);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects review when source session is not completed', async () => {
    practiceSessionQueryService.findSessionEntity.mockResolvedValue({
      ...completedSourceSession,
      status: PracticeSessionStatus.InProgress,
    });

    await expect(
      practiceReviewService.createReviewWrongSession({
        sourceSessionId,
        actorUserId,
        clientRequestId,
      }),
    ).rejects.toBeInstanceOf(PracticeReviewSourceNotCompletedError);
  });

  it('rejects review when no finally incorrect questions exist', async () => {
    attemptRepository.find.mockResolvedValue([
      {
        id: '99999999-9999-4999-8999-999999999999',
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 1,
        clientAnswerId: '88888888-8888-4888-8888-888888888888',
        selectedOptionIdsJson: JSON.stringify(['11111111-1111-4111-8111-111111111111']),
        isCorrect: true,
        score: 1,
        submittedAt: new Date(),
      },
    ] as PracticeAnswerAttemptEntity[]);

    await expect(
      practiceReviewService.createReviewWrongSession({
        sourceSessionId,
        actorUserId,
        clientRequestId,
      }),
    ).rejects.toBeInstanceOf(PracticeNoWrongQuestionsError);
  });
});
