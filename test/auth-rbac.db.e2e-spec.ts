import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createRbacDatabaseTestApplication } from './create-rbac-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'auth006-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'AUTH006_TESTER';

interface LoginResponseBody {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('RBAC authorization (db e2e)', () => {
  let application: INestApplication;
  let userAccountService: UserAccountService;
  let accessControlService: AccessControlService;

  beforeAll(async () => {
    application = await createRbacDatabaseTestApplication();
    userAccountService = application.get(UserAccountService);
    accessControlService = application.get(AccessControlService);
  });

  afterEach(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code = '${TEST_ROLE_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM permissions
      WHERE code IN ('test.read', 'test.manage')
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

  it('enforces permissions through PermissionGuard without embedding them in JWT', async () => {
    const email = buildTestEmail('rbac-flow');
    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    await accessControlService.createRole({
      code: TEST_ROLE_CODE,
      name: 'RBAC Tester',
    });
    await accessControlService.createPermission({
      code: 'test.read',
      name: 'Test read',
    });
    await accessControlService.createPermission({
      code: 'test.manage',
      name: 'Test manage',
    });
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'test.read');

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    const loginBody = loginResponse.body as LoginResponseBody;
    const accessToken = loginBody.accessToken;

    await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    await accessControlService.assignRoleToUser(loginBody.user.id, TEST_ROLE_CODE);

    await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/manage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'test.manage');

    await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/manage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('returns 403 for authenticated users without roles on protected routes', async () => {
    const email = buildTestEmail('no-roles');
    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    await accessControlService.createRole({
      code: TEST_ROLE_CODE,
      name: 'RBAC Tester',
    });
    await accessControlService.createPermission({
      code: 'test.read',
      name: 'Test read',
    });
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'test.read');

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    const response = await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/read')
      .set('Authorization', `Bearer ${(loginResponse.body as LoginResponseBody).accessToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).message).toBe('Forbidden');
  });

  it('allows authenticated-only routes when PermissionGuard has no metadata', async () => {
    const email = buildTestEmail('authenticated-only');
    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    await request(getTestHttpServer(application))
      .get('/api/v1/test-rbac/authenticated-only')
      .set('Authorization', `Bearer ${(loginResponse.body as LoginResponseBody).accessToken}`)
      .expect(200);
  });
});
