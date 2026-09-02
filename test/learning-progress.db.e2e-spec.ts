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
import { LessonProgressStatus } from '../src/modules/learning-progress/enums/lesson-progress-status.enum';
import { UserEmailAlreadyExistsError } from '../src/modules/users/errors/user-account.errors';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const UNLINKED_PARENT_EMAIL = `learning-progress-unlinked@${AUTH_RBAC_SAMPLE_DOMAIN}`;

interface LoginResponseBody {
  accessToken: string;
}

interface StudentListResponseBody {
  items: Array<{ id: string; fullName: string }>;
}

interface EnrollmentListResponseBody {
  items: Array<{ id: string; classId: string }>;
}

interface CurriculumTreeResponseBody {
  topics: Array<{
    lessons: Array<{ canonicalLessonKey: string }>;
  }>;
}

interface LessonProgressResponseBody {
  status: LessonProgressStatus;
  canonicalLessonKey: string;
}

interface EnrollmentLearningProgressResponseBody {
  enrollmentId: string;
  learning: {
    lessonsAssigned: number;
    lessonsStarted: number;
    lessonsCompleted: number;
    completionRatio: number;
  };
  lessons: Array<{ canonicalLessonKey: string; status: LessonProgressStatus }>;
  practice: {
    standard: { sessionsCompleted: number; questionsAttempted: number };
    review: { sessionsCompleted: number };
    lastPracticedAt: string | null;
  };
  exam: {
    assignmentsAvailable: number;
    attemptsCompleted: number;
    latestScorePercent: string | null;
  };
  lastLearningActivityAt: string | null;
}

describe('Learning progress API (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let enrollmentId: string;
  let classId: string;
  let canonicalLessonKey: string;
  let parentToken: string;
  let unlinkedParentToken: string;
  let catechistToken: string;
  let adminToken: string;
  let superAdminToken: string;

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
    superAdminToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'SUPER_ADMIN')?.email ??
        `superadmin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
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
    classId = (enrollmentsResponse.body as EnrollmentListResponseBody).items[0]?.classId ?? '';

    if (enrollmentId.length === 0 || classId.length === 0) {
      throw new Error('Expected enrollment and class for demo student alpha.');
    }

    const treeResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${enrollmentId}/curriculum-tree`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const firstLesson = (treeResponse.body as CurriculumTreeResponseBody).topics[0]?.lessons[0];

    if (firstLesson === undefined) {
      throw new Error('Expected curriculum tree lesson.');
    }

    canonicalLessonKey = firstLesson.canonicalLessonKey;
  });

  afterEach(async () => {
    await AppDataSource.query(`DELETE FROM lesson_progress WHERE enrollment_id = @0`, [
      enrollmentId,
    ]);
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();
  });

  it('returns 401 for unauthenticated lesson progress patch', async () => {
    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(401);
  });

  it('allows linked parent PATCH and enrollment GET with lesson synthesis', async () => {
    const patchResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(200);

    expect((patchResponse.body as LessonProgressResponseBody).status).toBe(
      LessonProgressStatus.InProgress,
    );

    const aggregateResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${enrollmentId}/learning-progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const aggregate = aggregateResponse.body as EnrollmentLearningProgressResponseBody;
    expect(aggregate.learning.lessonsStarted).toBeGreaterThanOrEqual(1);
    expect(
      aggregate.lessons.some((lesson) => lesson.status === LessonProgressStatus.InProgress),
    ).toBe(true);
    expect(aggregate.exam.assignmentsAvailable).toBeGreaterThanOrEqual(0);
    expect(aggregate.exam.attemptsCompleted).toBeGreaterThanOrEqual(0);
    expect(aggregate.practice).toBeDefined();
    expect(JSON.stringify(aggregate)).not.toContain('selectedOptionIds');
    expect(JSON.stringify(aggregate)).not.toContain('correctOptionIds');
  });

  it('denies unlinked parent patch and parent class GET', async () => {
    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${unlinkedParentToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${classId}/learning-progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });

  it('denies catechist and parish admin lesson progress writes', async () => {
    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(403);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(403);
  });

  it('denies super admin learner-action lesson progress writes', async () => {
    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(403);
  });

  it('allows assigned catechist and parish admin class GET', async () => {
    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${classId}/learning-progress`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const adminResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${classId}/learning-progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminResponse.body).toHaveProperty('summary');
    expect(adminResponse.body).toHaveProperty('learners');
  });

  it('denies backward transition with 409', async () => {
    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ status: LessonProgressStatus.Completed })
      .expect(200);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/enrollments/${enrollmentId}/lessons/${canonicalLessonKey}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ status: LessonProgressStatus.InProgress })
      .expect(409);
  });
});
