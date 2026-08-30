import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { GuardianLinkStatus } from '../src/modules/student/enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../src/modules/student/enums/guardian-relationship-type.enum';
import { StudentStatus } from '../src/modules/student/enums/student-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { seedActiveEnrollmentForStudent, seedScopedParishForUser } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'cls004-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CLS004_TESTER';

interface LoginResponseBody {
  accessToken: string;
}

interface StudentResponseBody {
  id: string;
  fullName: string;
  status: StudentStatus;
}

interface GuardianLinkResponseBody {
  id: string;
  studentId: string;
  guardianUserId: string;
  status: GuardianLinkStatus;
}

describe('Student API (db e2e)', () => {
  let application: INestApplication;
  let userAccountService: UserAccountService;
  let accessControlService: AccessControlService;

  beforeAll(async () => {
    application = await createDatabaseTestApplication();
    userAccountService = application.get(UserAccountService);
    accessControlService = application.get(AccessControlService);
  });

  afterEach(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE 'cls004-e2e-%')
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE 'cls004-e2e-%')
    `);
    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE 'cls004-e2e-%'
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE 'cls004-e2e-%')
    `);
    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE 'cls004-e2e-%'
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE 'cls004-e2e-%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years WHERE name LIKE 'cls004-e2e-%'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE 'cls004-e2e-%'
    `);
    await AppDataSource.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code = '${TEST_ROLE_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM roles WHERE code = '${TEST_ROLE_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await application.close();
  });

  async function login(email: string): Promise<string> {
    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    return (loginResponse.body as LoginResponseBody).accessToken;
  }

  async function ensurePermission(code: string, name: string): Promise<void> {
    try {
      await accessControlService.createPermission({ code, name });
    } catch (error: unknown) {
      if (!(error instanceof PermissionCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function ensureRole(): Promise<void> {
    try {
      await accessControlService.createRole({
        code: TEST_ROLE_CODE,
        name: 'Student API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function setupManageUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string; parishId: string }> {
    const email = `${TEST_EMAIL_PREFIX}${localPart}@example.com`;
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });

    await ensurePermission('students.read', 'Read students');
    await ensurePermission('students.manage', 'Manage students');
    await ensurePermission('student-guardians.read', 'Read student guardians');
    await ensurePermission('student-guardians.manage', 'Manage student guardians');
    await ensureRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'students.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'students.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'student-guardians.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'student-guardians.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    const { parishId } = await seedScopedParishForUser(
      account.id,
      `${TEST_EMAIL_PREFIX}${localPart}-`,
    );

    return { accessToken: await login(email), userId: account.id, parishId };
  }

  it('returns 401 for unauthenticated student requests', async () => {
    await request(getTestHttpServer(application)).get('/api/v1/students').expect(401);
  });

  it('allows students.manage to create, update, and read students', async () => {
    const { accessToken, parishId } = await setupManageUser('manage');

    const createResponse = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'cls004-e2e-Nguyễn Văn An' })
      .expect(201);

    const created = createResponse.body as StudentResponseBody;
    expect(created.status).toBe(StudentStatus.Active);
    await seedActiveEnrollmentForStudent(created.id, parishId, `${TEST_EMAIL_PREFIX}manage-`);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/students/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'cls004-e2e-Nguyễn Văn An Updated' })
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/students/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('links and ends guardian relationships over HTTP', async () => {
    const { accessToken, parishId } = await setupManageUser('guardian');
    const guardianAccount = await userAccountService.createAccount({
      email: `${TEST_EMAIL_PREFIX}linked-guardian@example.com`,
      password: TEST_PASSWORD,
    });

    const createResponse = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'cls004-e2e-Guardian Student' })
      .expect(201);

    const student = createResponse.body as StudentResponseBody;
    await seedActiveEnrollmentForStudent(student.id, parishId, `${TEST_EMAIL_PREFIX}guardian-`);

    const linkResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/students/${student.id}/guardians`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        guardianUserId: guardianAccount.id,
        relationshipType: GuardianRelationshipType.Parent,
        isPrimary: true,
      })
      .expect(201);

    const link = linkResponse.body as GuardianLinkResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/student-guardians/${link.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: GuardianLinkStatus.Ended })
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/students/${student.id}/guardians`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
