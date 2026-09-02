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
import {
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
} from '../src/database/seeds/class-enrollment.seed.constants';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { EnrollmentStatus } from '../src/modules/enrollment/enums/enrollment-status.enum';
import { LearnerSelfScopeService } from '../src/modules/student/services/learner-self-scope.service';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

interface LoginResponseBody {
  accessToken: string;
}

interface LearnerContextResponseBody {
  linkedStudents: Array<{
    studentId: string;
    fullName: string;
    activeEnrollments: Array<{
      id: string;
      classId: string;
      status: EnrollmentStatus;
    }>;
  }>;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('GET /api/v1/me/learner-context (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let studentAlphaId: string;
  let studentAlphaToken: string;
  let parentToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    seedModuleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule, ParishAcademicSeedModule, ClassEnrollmentSeedModule],
    }).compile();

    const authRbacSeedService = seedModuleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = seedModuleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = seedModuleRef.get(ClassEnrollmentSeedService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });

    async function login(email: string): Promise<string> {
      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
        .expect(200);

      return (response.body as LoginResponseBody).accessToken;
    }

    studentAlphaToken = await login(CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL);
    parentToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
        `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );

    const learnerContextResponse = await request(getTestHttpServer(application))
      .get('/api/v1/me/learner-context')
      .set('Authorization', `Bearer ${studentAlphaToken}`)
      .expect(200);
    const alphaContext = (
      learnerContextResponse.body as LearnerContextResponseBody
    ).linkedStudents.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);

    if (alphaContext === undefined) {
      throw new Error('Expected demo student alpha in learner context.');
    }

    studentAlphaId = alphaContext.studentId;
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();
  });

  it('returns linked student profile and active enrollments for the student account', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/learner-context')
      .set('Authorization', `Bearer ${studentAlphaToken}`)
      .expect(200);

    const body = response.body as LearnerContextResponseBody;
    expect(body.linkedStudents).toHaveLength(1);
    expect(body.linkedStudents[0]?.fullName).toBe(CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);
    expect(body.linkedStudents[0]?.studentId).toBe(studentAlphaId);
    expect(body.linkedStudents[0]?.activeEnrollments.length).toBeGreaterThan(0);
    expect(
      body.linkedStudents[0]?.activeEnrollments.every(
        (enrollment) => enrollment.status === EnrollmentStatus.Active,
      ),
    ).toBe(true);
  });

  it('denies parent accounts that lack learner.self.read', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/me/learner-context')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).statusCode).toBe(403);
  });

  it('enforces learner self-scope separately from guardian read access', async () => {
    const learnerSelfScopeService = application.get(LearnerSelfScopeService);
    const userAccountService = application.get(UserAccountService);
    const parentUser = await userAccountService.findAccountSnapshotByEmail(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
        `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );

    if (parentUser === null) {
      throw new Error('Expected seeded parent account.');
    }

    await expect(
      learnerSelfScopeService.assertActingAsLinkedStudent(parentUser.id, studentAlphaId),
    ).rejects.toThrow('You may only act as the linked student account for this learner action.');
  });
});
