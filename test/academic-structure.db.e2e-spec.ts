import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { CatechismLevelStatus } from '../src/modules/academic-structure/enums/catechism-level-status.enum';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'par004-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'PAR004_TESTER';
const TEST_CODE_PREFIX = 'par004-e2e-';

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
  status: CatechismLevelStatus;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Academic structure API (db e2e)', () => {
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
        name: 'Academic Structure API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedPermissionsAndRole(): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('academic-years.read', 'Read academic years');
    await ensurePermission('academic-years.manage', 'Manage academic years');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensureRole();
  }

  async function createParish(
    accessToken: string,
    codeSuffix: string,
  ): Promise<ParishResponseBody> {
    const createResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}${codeSuffix}`,
        name: `Parish ${codeSuffix}`,
      })
      .expect(201);

    return createResponse.body as ParishResponseBody;
  }

  it('returns 401 for unauthenticated academic year list requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/academic-years')
      .expect(401);
  });

  it('returns 403 for authenticated users without academic-years.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/academic-years')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows manage permissions to create and transition academic years', async () => {
    const email = buildTestEmail('year-manage');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);
    const parish = await createParish(accessToken, 'year-manage');

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}2026-2027`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);

    const created = createResponse.body as AcademicYearResponseBody;
    expect(created.status).toBe(AcademicYearStatus.Planned);

    const activateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/academic-years/${created.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: AcademicYearStatus.Active })
      .expect(200);

    expect((activateResponse.body as AcademicYearResponseBody).status).toBe(
      AcademicYearStatus.Active,
    );

    await request(getTestHttpServer(application))
      .get(`/api/v1/academic-years/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('allows manage permissions to create and update catechism levels', async () => {
    const email = buildTestEmail('level-manage');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);
    const parish = await createParish(accessToken, 'level-manage');

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}level-1`,
        name: 'Sơ Cấp 1',
        sortOrder: 1,
      })
      .expect(201);

    const created = createResponse.body as CatechismLevelResponseBody;
    expect(created.code).toBe(`${TEST_CODE_PREFIX}level-1`);
    expect(created.status).toBe(CatechismLevelStatus.Active);

    const updateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/catechism-levels/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Level Name' })
      .expect(200);

    expect((updateResponse.body as CatechismLevelResponseBody).name).toBe('Updated Level Name');
  });

  it('returns 409 for duplicate academic year names and catechism level codes', async () => {
    const email = buildTestEmail('conflicts');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);
    const parish = await createParish(accessToken, 'conflicts');

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}dup-year`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);

    const duplicateYearResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}dup-year`,
        startDate: '2027-09-01',
        endDate: '2028-06-30',
      })
      .expect(409);

    expect((duplicateYearResponse.body as ErrorResponseBody).statusCode).toBe(409);

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}dup-level`,
        name: 'Level One',
        sortOrder: 1,
      })
      .expect(201);

    const duplicateLevelResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}dup-level`,
        name: 'Level Two',
        sortOrder: 2,
      })
      .expect(409);

    expect((duplicateLevelResponse.body as ErrorResponseBody).statusCode).toBe(409);
  });
});
