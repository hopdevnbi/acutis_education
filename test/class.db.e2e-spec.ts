import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { ClassStatus } from '../src/modules/class/enums/class-status.enum';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'cls003-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CLS003_TESTER';
const TEST_CODE_PREFIX = 'cls003-e2e-';

interface LoginResponseBody {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface ParishResponseBody {
  id: string;
  code: string;
  name: string;
  status: ParishStatus;
}

interface AcademicYearResponseBody {
  id: string;
  parishId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
}

interface CatechismLevelResponseBody {
  id: string;
  parishId: string;
  code: string;
  name: string;
  sortOrder: number;
  status: string;
}

interface ClassResponseBody {
  id: string;
  parishId: string;
  academicYearId: string;
  catechismLevelId: string;
  code: string;
  name: string;
  status: ClassStatus;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Class API (db e2e)', () => {
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
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM classes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
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
      DELETE FROM roles
      WHERE code = '${TEST_ROLE_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await application.close();
  });

  function buildTestEmail(localPart: string): string {
    return `${TEST_EMAIL_PREFIX}${localPart}@example.com`;
  }

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
        name: 'Class API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedClassPermissions(): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('academic-years.read', 'Read academic years');
    await ensurePermission('academic-years.manage', 'Manage academic years');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('classes.read', 'Read classes');
    await ensurePermission('classes.manage', 'Manage classes');
    await ensureRole();
  }

  async function createParish(accessToken: string, suffix: string): Promise<ParishResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}${suffix}`,
        name: `Parish ${suffix}`,
      })
      .expect(201);

    return response.body as ParishResponseBody;
  }

  async function createAcademicYear(
    accessToken: string,
    parishId: string,
    suffix: string,
  ): Promise<AcademicYearResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parishId}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}${suffix}`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);

    return response.body as AcademicYearResponseBody;
  }

  async function createCatechismLevel(
    accessToken: string,
    parishId: string,
    suffix: string,
  ): Promise<CatechismLevelResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parishId}/catechism-levels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}${suffix}`,
        name: `Level ${suffix}`,
        sortOrder: 1,
      })
      .expect(201);

    return response.body as CatechismLevelResponseBody;
  }

  async function setupManageUser(localPart: string): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedClassPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  it('returns 401 for unauthenticated class list requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/classes')
      .expect(401);
  });

  it('returns 403 for authenticated users without classes.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows classes.manage to create, update, activate, and list classes', async () => {
    const { accessToken, userId } = await setupManageUser('manage');
    const parish = await createParish(accessToken, 'manage');
    await ensureTestParishMembership(userId, parish.id);
    const academicYear = await createAcademicYear(accessToken, parish.id, 'year-manage');
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-manage');

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}class-manage`,
        name: 'Lớp Quản Lý',
      })
      .expect(201);

    const created = createResponse.body as ClassResponseBody;
    expect(created.status).toBe(ClassStatus.Planned);
    expect(created.name).toBe('Lớp Quản Lý');

    const updateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Lớp Quản Lý Updated' })
      .expect(200);

    expect((updateResponse.body as ClassResponseBody).name).toBe('Lớp Quản Lý Updated');

    await request(getTestHttpServer(application))
      .patch(`/api/v1/academic-years/${academicYear.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: AcademicYearStatus.Active })
      .expect(200);

    const activateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${created.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    expect((activateResponse.body as ClassResponseBody).status).toBe(ClassStatus.Active);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((listResponse.body as { total: number }).total).toBe(1);

    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('returns 403 for read-only users attempting class mutations', async () => {
    const email = buildTestEmail('read-only');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedClassPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .post('/api/v1/parishes/11111111-1111-4111-8111-111111111111/classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        academicYearId: '22222222-2222-4222-8222-222222222222',
        catechismLevelId: '33333333-3333-4333-8333-333333333333',
        code: `${TEST_CODE_PREFIX}read-only`,
        name: 'Read Only',
      })
      .expect(403);
  });

  it('returns 409 for duplicate class codes within parish and academic year', async () => {
    const { accessToken, userId } = await setupManageUser('duplicate');
    const parish = await createParish(accessToken, 'duplicate');
    await ensureTestParishMembership(userId, parish.id);
    const academicYear = await createAcademicYear(accessToken, parish.id, 'year-dup');
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-dup');
    const duplicateCode = `${TEST_CODE_PREFIX}dup-class`;

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: catechismLevel.id,
        code: duplicateCode,
        name: 'First Class',
      })
      .expect(201);

    const duplicateResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: catechismLevel.id,
        code: duplicateCode,
        name: 'Second Class',
      })
      .expect(409);

    expect((duplicateResponse.body as ErrorResponseBody).statusCode).toBe(409);
  });

  it('returns 404 for missing class detail requests', async () => {
    const email = buildTestEmail('missing');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedClassPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/classes/55555555-5555-4555-8555-555555555555')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
