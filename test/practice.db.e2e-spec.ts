import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import {
  AUTH_RBAC_SAMPLE_DOMAIN,
  AUTH_RBAC_SAMPLE_PASSWORD,
  AUTH_RBAC_SEED_USERS,
} from '../src/database/seeds/auth-rbac.seed.constants';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME } from '../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { QuestionBankDemoSeedModule } from '../src/database/seeds/question-bank-demo-seed.module';
import { QuestionBankDemoSeedService } from '../src/database/seeds/question-bank-demo.seed.service';
import { generateUuidV4 } from '../src/database/uuid-v4.util';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { PracticeSessionStatus } from '../src/modules/practice/enums/practice-session-status.enum';
import { UserEmailAlreadyExistsError } from '../src/modules/users/errors/user-account.errors';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const UNLINKED_PARENT_EMAIL = `practice-unlinked@${AUTH_RBAC_SAMPLE_DOMAIN}`;

const SINGLE_CHOICE_SESSION_REQUEST = {
  questionCount: 1,
  questionTypes: [QuestionType.SingleChoice],
  randomizeQuestions: false,
  randomizeOptions: false,
} as const;

interface LoginResponseBody {
  accessToken: string;
}

interface StudentListResponseBody {
  items: Array<{ id: string; fullName: string }>;
}

interface EnrollmentListResponseBody {
  items: Array<{ id: string }>;
}

interface PracticeSessionResponseBody {
  id: string;
  enrollmentId: string;
  status: PracticeSessionStatus;
  questions: Array<{
    sessionQuestionId: string;
    position: number;
    questionVersionId: string;
    prompt: string;
    options: Array<{ id: string; deliveredPosition: number }>;
    attemptState: {
      attemptCount: number;
      canRetry: boolean;
      finalized: boolean;
      feedbackRevealed: boolean;
      feedback: { correctOptionIds: string[] } | null;
    };
  }>;
  summary: {
    totalQuestions: number;
    sessionCompleted: boolean;
  };
}

interface PracticeAnswerResponseBody {
  attemptId: string;
  isCorrect: boolean;
  canRetry: boolean;
  questionFinalized: boolean;
  sessionCompleted: boolean;
  feedback: { correctOptionIds: string[] } | null;
}

describe('Practice API (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let enrollmentId: string;
  let parentToken: string;
  let unlinkedParentToken: string;
  let catechistToken: string;
  let adminToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    seedModuleRef = await Test.createTestingModule({
      imports: [
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        CurriculumDemoSeedModule,
        QuestionBankDemoSeedModule,
      ],
    }).compile();

    const authRbacSeedService = seedModuleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = seedModuleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = seedModuleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = seedModuleRef.get(CurriculumDemoSeedService);
    const questionBankDemoSeedService = seedModuleRef.get(QuestionBankDemoSeedService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();
    await questionBankDemoSeedService.run();

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });

    const userAccountService = application.get(UserAccountService);
    const accessControlService = application.get(AccessControlService);

    try {
      const unlinkedParent = await userAccountService.createAccount({
        email: UNLINKED_PARENT_EMAIL,
        password: AUTH_RBAC_SAMPLE_PASSWORD,
      });
      await accessControlService.assignRoleToUser(unlinkedParent.id, 'PARENT');
    } catch (error: unknown) {
      if (!(error instanceof UserEmailAlreadyExistsError)) {
        throw error;
      }
    }

    async function login(email: string): Promise<string> {
      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
        .expect(200);

      return (response.body as LoginResponseBody).accessToken;
    }

    parentToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
        `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );
    unlinkedParentToken = await login(UNLINKED_PARENT_EMAIL);
    catechistToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'CATECHIST')?.email ??
        `catechist@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );
    adminToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
        `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );

    const studentsResponse = await request(getTestHttpServer(application))
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME, limit: 5 })
      .expect(200);
    const alphaStudent = (studentsResponse.body as StudentListResponseBody).items.find(
      (item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    );

    if (alphaStudent === undefined) {
      throw new Error('Expected demo student alpha.');
    }

    const enrollmentsResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/students/${alphaStudent.id}/enrollments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .query({ limit: 5 })
      .expect(200);

    enrollmentId = (enrollmentsResponse.body as EnrollmentListResponseBody).items[0]?.id ?? '';

    if (enrollmentId.length === 0) {
      throw new Error('Expected enrollment for demo student alpha.');
    }
  });

  afterEach(async () => {
    await AppDataSource.query(`DELETE FROM practice_sessions WHERE enrollment_id = @0`, [
      enrollmentId,
    ]);
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(
      `
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email = @0)
    `,
      [UNLINKED_PARENT_EMAIL],
    );
    await AppDataSource.query(
      `
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email = @0)
    `,
      [UNLINKED_PARENT_EMAIL],
    );
    await AppDataSource.query(
      `
      DELETE FROM users WHERE email = @0
    `,
      [UNLINKED_PARENT_EMAIL],
    );
  });

  it('returns 401 for unauthenticated session create', async () => {
    await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .send({ questionCount: 1 })
      .expect(401);
  });

  it('returns 201 for linked parent session create and stable GET resume', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ questionCount: 1, randomizeQuestions: false, randomizeOptions: false })
      .expect(201);

    const created = createResponse.body as PracticeSessionResponseBody;
    expect(created.enrollmentId.toLowerCase()).toBe(enrollmentId.toLowerCase());
    expect(created.questions).toHaveLength(1);

    const getResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/practice-sessions/${created.id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const resumed = getResponse.body as PracticeSessionResponseBody;
    expect(resumed.questions.map((question) => question.questionVersionId)).toEqual(
      created.questions.map((question) => question.questionVersionId),
    );
    expect(resumed.questions[0]?.options[0]?.deliveredPosition).toBe(1);
  });

  it('returns 403 for catechist create and learner session GET', async () => {
    await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({ questionCount: 1 })
      .expect(403);

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ questionCount: 1 })
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;

    await request(getTestHttpServer(application))
      .get(`/api/v1/practice-sessions/${created.id}`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(403);
  });

  it('returns 403 for parish admin session create by default', async () => {
    await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionCount: 1 })
      .expect(403);
  });

  it('returns 403 for parent without guardian link', async () => {
    await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${unlinkedParentToken}`)
      .send({ questionCount: 1 })
      .expect(403);
  });

  it('returns 401 for unauthenticated answer submission', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send(SINGLE_CHOICE_SESSION_REQUEST)
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const sessionQuestionId = created.questions[0]?.sessionQuestionId ?? generateUuidV4();

    await request(getTestHttpServer(application))
      .post(`/api/v1/practice-sessions/${created.id}/questions/${sessionQuestionId}/answers`)
      .send({
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [created.questions[0]?.options[0]?.id ?? generateUuidV4()],
      })
      .expect(401);
  });

  it('supports linked parent answer submission with feedback gating and retry', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send(SINGLE_CHOICE_SESSION_REQUEST)
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const wrongOptionId = question.options[1]?.id ?? question.options[0]?.id;

    const wrongResponse = await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [wrongOptionId],
      })
      .expect(201);

    const wrongBody = wrongResponse.body as PracticeAnswerResponseBody;
    expect(wrongBody.isCorrect).toBe(false);
    expect(wrongBody.canRetry).toBe(true);
    expect(wrongBody.feedback).toBeNull();

    const correctOptionId = question.options[0]?.id ?? generateUuidV4();
    const correctResponse = await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [correctOptionId],
      })
      .expect(201);

    const correctBody = correctResponse.body as PracticeAnswerResponseBody;
    expect(correctBody.isCorrect).toBe(true);
    expect(correctBody.questionFinalized).toBe(true);
    expect(correctBody.sessionCompleted).toBe(true);
    expect(correctBody.feedback).not.toBeNull();

    const getResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/practice-sessions/${created.id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const completed = getResponse.body as PracticeSessionResponseBody;
    expect(completed.status).toBe(PracticeSessionStatus.Completed);
    expect(completed.summary.sessionCompleted).toBe(true);
    expect(completed.questions[0]?.attemptState.feedback).not.toBeNull();
  });

  it('returns 403 for catechist and parish admin answer submission', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ questionCount: 1 })
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const payload = {
      clientAnswerId: generateUuidV4(),
      selectedOptionIds: [question.options[0]?.id ?? generateUuidV4()],
    };

    await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(payload)
      .expect(403);

    await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(403);
  });

  it('replays answer submission with HTTP 200 and rejects id mismatch with 409', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send(SINGLE_CHOICE_SESSION_REQUEST)
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const clientAnswerId = generateUuidV4();
    const selectedOptionIds = [question.options[0]?.id ?? generateUuidV4()];

    const firstResponse = await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientAnswerId, selectedOptionIds })
      .expect(201);

    const replayResponse = await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientAnswerId, selectedOptionIds })
      .expect(200);

    expect((replayResponse.body as PracticeAnswerResponseBody).attemptId).toBe(
      (firstResponse.body as PracticeAnswerResponseBody).attemptId,
    );

    await request(getTestHttpServer(application))
      .post(
        `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        clientAnswerId,
        selectedOptionIds: [question.options[1]?.id ?? generateUuidV4()],
      })
      .expect(409);
  });

  it('creates review-wrong session and replays clientRequestId with HTTP 200', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send(SINGLE_CHOICE_SESSION_REQUEST)
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const wrongOptionId = question.options[1]?.id ?? question.options[0]?.id;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(getTestHttpServer(application))
        .post(
          `/api/v1/practice-sessions/${created.id}/questions/${question.sessionQuestionId}/answers`,
        )
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          clientAnswerId: generateUuidV4(),
          selectedOptionIds: [wrongOptionId],
        })
        .expect(201);
    }

    const clientRequestId = generateUuidV4();
    const reviewResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/practice-sessions/${created.id}/review-wrong`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientRequestId })
      .expect(201);

    const reviewSession = reviewResponse.body as PracticeSessionResponseBody;
    expect(reviewSession.questions).toHaveLength(1);

    const replayResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/practice-sessions/${created.id}/review-wrong`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientRequestId })
      .expect(200);

    expect((replayResponse.body as PracticeSessionResponseBody).id).toBe(reviewSession.id);
  });

  it('returns 404 when contextual media asset is not referenced by the question', async () => {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ questionCount: 1 })
      .expect(201);
    const created = createResponse.body as PracticeSessionResponseBody;
    const sessionQuestionId = created.questions[0]?.sessionQuestionId ?? generateUuidV4();
    const unrelatedAssetId = generateUuidV4();

    await request(getTestHttpServer(application))
      .get(
        `/api/v1/practice-sessions/${created.id}/questions/${sessionQuestionId}/media/${unrelatedAssetId}/content`,
      )
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);
  });

  it('replays idempotent clientRequestId and supports abandon', async () => {
    const clientRequestId = generateUuidV4();

    const firstResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientRequestId, questionCount: 1, randomizeQuestions: false })
      .expect(201);
    const secondResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollmentId}/practice-sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ clientRequestId, questionCount: 1, randomizeQuestions: false })
      .expect(201);

    const first = firstResponse.body as PracticeSessionResponseBody;
    const second = secondResponse.body as PracticeSessionResponseBody;
    expect(second.id).toBe(first.id);

    const abandonResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/practice-sessions/${first.id}/abandon`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect((abandonResponse.body as PracticeSessionResponseBody).status).toBe(
      PracticeSessionStatus.Abandoned,
    );
  });
});
