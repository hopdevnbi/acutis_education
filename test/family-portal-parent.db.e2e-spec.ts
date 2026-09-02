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
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from '../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { EnrollmentStatus } from '../src/modules/enrollment/enums/enrollment-status.enum';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

interface LoginResponseBody {
  accessToken: string;
}

interface ParentContextResponseBody {
  actorUserId: string;
  linkedChildCount: number;
  activeEnrollmentCount: number;
}

interface ParentChildrenResponseBody {
  items: Array<{
    studentId: string;
    displayName: string;
    activeEnrollments: Array<{
      enrollmentId: string;
      classId: string;
      className: string;
    }>;
  }>;
}

interface ParentEnrollmentProgressResponseBody {
  enrollmentId: string;
  studentId: string;
  enrollmentStatus: EnrollmentStatus;
  progress: {
    enrollmentId: string;
    learning: {
      lessonsAssigned: number;
    };
    exam: {
      assignmentsAvailable: number;
      attemptsCompleted: number;
    };
  };
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Family Portal parent routes (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let parentToken: string;
  let catechistToken: string;
  let linkedEnrollmentId: string;

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

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });

    async function login(email: string): Promise<string> {
      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
        .expect(200);

      return (response.body as LoginResponseBody).accessToken;
    }

    parentToken = await login(CLASS_ENROLLMENT_SEED_PARENT_EMAIL);
    catechistToken = await login(CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL);
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('returns parent context for linked parent actors', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/parent/context')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const body = response.body as ParentContextResponseBody;

    expect(body.linkedChildCount).toBeGreaterThanOrEqual(1);
    expect(body.activeEnrollmentCount).toBeGreaterThanOrEqual(1);
  });

  it('lists linked children with active enrollments', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const body = response.body as ParentChildrenResponseBody;
    const alphaChild = body.items.find(
      (item) => item.displayName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    );

    expect(alphaChild).toBeDefined();

    if (alphaChild === undefined) {
      throw new Error('Expected demo student alpha in parent children list.');
    }

    expect(alphaChild.activeEnrollments.length).toBeGreaterThanOrEqual(1);
    linkedEnrollmentId = alphaChild.activeEnrollments[0]?.enrollmentId ?? '';
  });

  it('returns enrollment progress for linked child enrollments', async () => {
    expect(linkedEnrollmentId).toBeDefined();

    const response = await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${linkedEnrollmentId}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    const body = response.body as ParentEnrollmentProgressResponseBody;

    expect(body.enrollmentId).toBe(linkedEnrollmentId);
    expect(body.enrollmentStatus).toBe(EnrollmentStatus.Active);
    expect(typeof body.progress.learning.lessonsAssigned).toBe('number');
    expect(typeof body.progress.exam.assignmentsAvailable).toBe('number');
  });

  it('rejects catechist actors on parent routes', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/parent/context')
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).message).toContain('parent actor');
  });

  it('returns not found for unknown enrollments', async () => {
    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${'99999999-9999-4999-8999-999999999999'}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);
  });
});
