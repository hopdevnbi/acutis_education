import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_RBAC_SAMPLE_PASSWORD } from '../src/database/seeds/auth-rbac.seed.constants';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../src/database/seeds/class-enrollment.seed.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from '../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../src/database/seeds/parish-academic.seed.constants';
import { ClassService } from '../src/modules/class/services/class.service';
import { EnrollmentStatus } from '../src/modules/enrollment/enums/enrollment-status.enum';
import { ParishService } from '../src/modules/parish/services/parish.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

interface LoginResponseBody {
  accessToken: string;
}

interface CatechistContextResponseBody {
  actorUserId: string;
  assignedClassCount: number;
  parishIds: string[];
}

interface CatechistClassListResponseBody {
  items: Array<{
    classId: string;
    classCode: string;
    className: string;
    activeEnrollmentCount: number;
  }>;
  total: number;
}

interface CatechistRosterResponseBody {
  classId: string;
  learners: {
    items: Array<{
      studentId: string;
      enrollmentId: string;
      displayName: string;
      enrollmentStatus: EnrollmentStatus;
      exam: {
        assignmentsAvailable: number;
        attemptsCompleted: number;
        latestScorePercent: string | null;
      };
    }>;
    total: number;
  };
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Family Portal catechist routes (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let demoClassAId: string;
  let catechistToken: string;
  let parentToken: string;

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
      ],
    }).compile();

    const authRbacSeedService = seedModuleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = seedModuleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = seedModuleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = seedModuleRef.get(CurriculumDemoSeedService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();

    const parishService = seedModuleRef.get(ParishService);
    const classService = seedModuleRef.get(ClassService);
    const parishList = await parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );

    if (parish === undefined) {
      throw new Error('Expected demo parish from seed.');
    }

    const classList = await classService.listClassesByParish(parish.id, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
    });
    const classA = classList.items.find((item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE);

    if (classA === undefined) {
      throw new Error('Expected demo class A from seed.');
    }

    demoClassAId = classA.id;

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });

    async function login(email: string): Promise<string> {
      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
        .expect(200);

      return (response.body as LoginResponseBody).accessToken;
    }

    catechistToken = await login(CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL);
    parentToken = await login(CLASS_ENROLLMENT_SEED_PARENT_EMAIL);
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('returns catechist context for assigned catechist actors', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/catechist/context')
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const body = response.body as CatechistContextResponseBody;

    expect(body.assignedClassCount).toBeGreaterThanOrEqual(2);
    expect(body.parishIds.length).toBeGreaterThan(0);
  });

  it('lists assigned class summaries for catechist actors', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/catechist/classes')
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const body = response.body as CatechistClassListResponseBody;

    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.items.some((item) => item.classCode === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE)).toBe(
      true,
    );
  });

  it('returns roster rows for assigned classes', async () => {
    const response = await request(getTestHttpServer(application))
      .get(`/api/v1/me/catechist/classes/${demoClassAId}/roster`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const body = response.body as CatechistRosterResponseBody;

    expect(body.classId).toBe(demoClassAId);
    expect(body.learners.total).toBeGreaterThanOrEqual(1);
    expect(
      body.learners.items.some(
        (item) => item.displayName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      ),
    ).toBe(true);
    const firstLearner = body.learners.items[0];

    expect(firstLearner).toBeDefined();

    if (firstLearner === undefined) {
      throw new Error('Expected at least one roster learner.');
    }

    expect(typeof firstLearner.exam.assignmentsAvailable).toBe('number');
    expect(typeof firstLearner.exam.attemptsCompleted).toBe('number');
  });

  it('rejects parent actors on catechist routes', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/catechist/context')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).message).toContain('catechist actor');
  });

  it('rejects catechist access to unassigned classes', async () => {
    const response = await request(getTestHttpServer(application))
      .get(`/api/v1/me/catechist/classes/${'99999999-9999-4999-8999-999999999999'}/roster`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).message).toContain('assigned');
  });
});
