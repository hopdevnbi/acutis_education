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
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from '../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../src/database/seeds/curriculum-demo.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../src/database/seeds/parish-academic.seed.constants';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { ClassService } from '../src/modules/class/services/class.service';
import { UserEmailAlreadyExistsError } from '../src/modules/users/errors/user-account.errors';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { ParishService } from '../src/modules/parish/services/parish.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const UNLINKED_PARENT_EMAIL = `family-portal-unlinked-parent@${AUTH_RBAC_SAMPLE_DOMAIN}`;

interface LoginResponseBody {
  accessToken: string;
}

interface ParentChildrenResponseBody {
  items: Array<{
    studentId: string;
    displayName: string;
    studentStatus: string;
    activeEnrollments: Array<{
      enrollmentId: string;
      classId: string;
      className: string;
      parishId: string;
      academicYearId: string;
      catechismLevelId: string;
    }>;
  }>;
}

interface CatechistRosterResponseBody {
  learners: {
    items: Array<Record<string, unknown>>;
  };
}

interface ParentProgressResponseBody {
  enrollmentId: string;
  studentId: string;
  enrollmentStatus: string;
  progress: Record<string, unknown>;
}

describe('Family Portal cross-actor denial matrix (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let demoClassId: string;
  let linkedEnrollmentId: string;
  let parentToken: string;
  let unlinkedParentToken: string;
  let catechistToken: string;
  let studentToken: string;
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
      ],
    }).compile();

    await seedModuleRef.get(AuthRbacSeedService).run();
    await seedModuleRef.get(ParishAcademicSeedService).run();
    await seedModuleRef.get(ClassEnrollmentSeedService).run();
    await seedModuleRef.get(CurriculumDemoSeedService).run();

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
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
    });

    if (classList.items[0] === undefined) {
      throw new Error('Expected demo class from seed.');
    }

    demoClassId = classList.items[0].id;

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

    parentToken = await login(CLASS_ENROLLMENT_SEED_PARENT_EMAIL);
    unlinkedParentToken = await login(UNLINKED_PARENT_EMAIL);
    catechistToken = await login(CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL);
    studentToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'STUDENT')?.email ??
        `student-alpha@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );
    adminToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
        `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );
    superAdminToken = await login(
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'SUPER_ADMIN')?.email ??
        `superadmin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    );

    const childrenResponse = await request(getTestHttpServer(application))
      .get('/api/v1/me/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const alphaChild = (childrenResponse.body as ParentChildrenResponseBody).items.find(
      (item) => item.displayName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    );

    if (alphaChild?.activeEnrollments[0] === undefined) {
      throw new Error('Expected linked child enrollment for parent actor.');
    }

    linkedEnrollmentId = alphaChild.activeEnrollments[0].enrollmentId;
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('Parent actor', () => {
    it('allows parent context, children, and linked enrollment progress', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/context')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      await request(getTestHttpServer(application))
        .get(`/api/v1/me/parent/enrollments/${linkedEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('denies parent portal routes to catechist actors', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/context')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(403);
    });

    it('denies foreign enrollment progress for unlinked parent actors', async () => {
      await request(getTestHttpServer(application))
        .get(`/api/v1/me/parent/enrollments/${linkedEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${unlinkedParentToken}`)
        .expect(403);
    });

    it('denies class-wide learning progress aggregates', async () => {
      await request(getTestHttpServer(application))
        .get(`/api/v1/classes/${demoClassId}/learning-progress`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('denies formal exam attempt start for parent actors', async () => {
      await request(getTestHttpServer(application))
        .post(`/api/v1/enrollments/${linkedEnrollmentId}/exam-attempts`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ examAssignmentId: '99999999-9999-4999-8999-999999999999' })
        .expect(403);
    });

    it('returns compact progress fields without lesson or answer payloads', async () => {
      const response = await request(getTestHttpServer(application))
        .get(`/api/v1/me/parent/enrollments/${linkedEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      const body = response.body as ParentProgressResponseBody;

      expect(Object.keys(body).sort()).toEqual(
        ['enrollmentId', 'enrollmentStatus', 'progress', 'studentId'].sort(),
      );
      expect(Object.keys(body.progress).sort()).toEqual(
        [
          'enrollmentId',
          'exam',
          'filters',
          'lastLearningActivityAt',
          'learning',
          'practice',
        ].sort(),
      );
      expect(body.progress).not.toHaveProperty('lessons');
      expect(JSON.stringify(body)).not.toMatch(/answer|correctAnswer|explanation/i);
    });

    it('returns allow-listed child fields only', async () => {
      const response = await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const child = (response.body as ParentChildrenResponseBody).items[0];

      if (child === undefined) {
        throw new Error('Expected at least one linked child.');
      }

      expect(Object.keys(child).sort()).toEqual(
        ['activeEnrollments', 'displayName', 'studentId', 'studentStatus'].sort(),
      );

      const enrollment = child.activeEnrollments[0];

      if (enrollment === undefined) {
        throw new Error('Expected at least one active enrollment.');
      }

      expect(Object.keys(enrollment).sort()).toEqual(
        [
          'academicYearId',
          'catechismLevelId',
          'classId',
          'className',
          'enrollmentId',
          'parishId',
        ].sort(),
      );
    });
  });

  describe('Catechist actor', () => {
    it('allows assigned catechist portal routes', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/catechist/context')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(200);

      await request(getTestHttpServer(application))
        .get('/api/v1/me/catechist/classes')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(200);

      await request(getTestHttpServer(application))
        .get(`/api/v1/me/catechist/classes/${demoClassId}/roster`)
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(200);
    });

    it('denies unassigned class roster access', async () => {
      await request(getTestHttpServer(application))
        .get(`/api/v1/me/catechist/classes/${'99999999-9999-4999-8999-999999999999'}/roster`)
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(403);
    });

    it('denies parent portal routes', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/context')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(403);
    });

    it('denies formal exam attempt start for catechist actors', async () => {
      await request(getTestHttpServer(application))
        .post(`/api/v1/enrollments/${linkedEnrollmentId}/exam-attempts`)
        .set('Authorization', `Bearer ${catechistToken}`)
        .send({ examAssignmentId: '99999999-9999-4999-8999-999999999999' })
        .expect(403);
    });

    it('returns allow-listed roster learner fields only', async () => {
      const response = await request(getTestHttpServer(application))
        .get(`/api/v1/me/catechist/classes/${demoClassId}/roster`)
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(200);
      const learner = (response.body as CatechistRosterResponseBody).learners.items[0];

      if (learner === undefined) {
        throw new Error('Expected at least one roster learner.');
      }

      expect(Object.keys(learner).sort()).toEqual(
        [
          'displayName',
          'enrollmentId',
          'enrollmentStatus',
          'exam',
          'lastLearningActivityAt',
          'learning',
          'practice',
          'studentId',
        ].sort(),
      );
      expect(JSON.stringify(learner)).not.toMatch(
        /dateOfBirth|address|phone|email|guardian|answer|explanation/i,
      );
    });
  });

  describe('Student actor', () => {
    it('denies family portal parent and catechist routes', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/context')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      await request(getTestHttpServer(application))
        .get('/api/v1/me/catechist/context')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('Admin actors', () => {
    it('does not allow parish or super administrators to impersonate either portal actor', async () => {
      for (const token of [adminToken, superAdminToken]) {
        await request(getTestHttpServer(application))
          .get('/api/v1/me/parent/context')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        await request(getTestHttpServer(application))
          .get('/api/v1/me/catechist/context')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }
    });
  });

  describe('HTTP contract validation', () => {
    it('requires authentication for both portal route groups', async () => {
      await request(getTestHttpServer(application)).get('/api/v1/me/parent/context').expect(401);
      await request(getTestHttpServer(application)).get('/api/v1/me/catechist/context').expect(401);
    });

    it('rejects malformed route UUIDs and invalid pagination', async () => {
      await request(getTestHttpServer(application))
        .get('/api/v1/me/parent/enrollments/not-a-uuid/progress')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(400);

      await request(getTestHttpServer(application))
        .get('/api/v1/me/catechist/classes/not-a-uuid/roster')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(400);

      await request(getTestHttpServer(application))
        .get('/api/v1/me/catechist/classes?page=0&limit=51')
        .set('Authorization', `Bearer ${catechistToken}`)
        .expect(400);
    });
  });
});
