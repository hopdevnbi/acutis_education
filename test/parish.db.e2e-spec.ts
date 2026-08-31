import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'par003-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'PAR003_TESTER';
const TEST_CODE_PREFIX = 'par003-e2e-';

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

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Parish API (db e2e)', () => {
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

  async function seedPermissionsAndRole(): Promise<void> {
    try {
      await accessControlService.createPermission({
        code: 'parishes.read',
        name: 'Read parishes',
      });
    } catch (error: unknown) {
      if (!(error instanceof PermissionCodeAlreadyExistsError)) {
        throw error;
      }
    }

    try {
      await accessControlService.createPermission({
        code: 'parishes.manage',
        name: 'Manage parishes',
      });
    } catch (error: unknown) {
      if (!(error instanceof PermissionCodeAlreadyExistsError)) {
        throw error;
      }
    }

    try {
      await accessControlService.createRole({
        code: TEST_ROLE_CODE,
        name: 'Parish API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  it('returns 401 for unauthenticated parish list requests', async () => {
    await request(getTestHttpServer(application)).get('/api/v1/parishes').expect(401);
  });

  it('returns 403 for authenticated users without parishes.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows parishes.read for list and detail, but blocks manage operations', async () => {
    const email = buildTestEmail('read-only');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    const createResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}read-only`,
        name: 'Read Only Parish',
      })
      .expect(403);

    expect((createResponse.body as ErrorResponseBody).statusCode).toBe(403);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('allows parishes.manage to create, update, and change status', async () => {
    const email = buildTestEmail('manage');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    const createResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}manage`,
        name: 'Giáo xứ Quản Lý',
      })
      .expect(201);

    const created = createResponse.body as ParishResponseBody;
    expect(created.code).toBe(`${TEST_CODE_PREFIX}manage`);
    expect(created.name).toBe('Giáo xứ Quản Lý');
    expect(created.status).toBe(ParishStatus.Active);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const updateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/parishes/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Parish Name' })
      .expect(200);

    expect((updateResponse.body as ParishResponseBody).name).toBe('Updated Parish Name');

    const statusResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/parishes/${created.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: ParishStatus.Inactive })
      .expect(200);

    expect((statusResponse.body as ParishResponseBody).status).toBe(ParishStatus.Inactive);
  });

  it('returns 409 for duplicate parish codes and 404 for missing parishes', async () => {
    const email = buildTestEmail('conflicts');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}dup`,
        name: 'First Parish',
      })
      .expect(201);

    const duplicateResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}dup`,
        name: 'Second Parish',
      })
      .expect(409);

    expect((duplicateResponse.body as ErrorResponseBody).statusCode).toBe(409);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 400 for invalid create payloads', async () => {
    const email = buildTestEmail('invalid');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissionsAndRole();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: 'Invalid Code',
        name: '',
      })
      .expect(400);
  });
});
