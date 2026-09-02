import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'loc005-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'LOC005_TESTER';
const TEST_CODE_PREFIX = 'loc005-e2e-';

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

interface TranslationResourceListResponseBody {
  page: number;
  items: unknown[];
  total: number;
}

describe('Localization admin API (db e2e)', () => {
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
      DELETE FROM translation_jobs
      WHERE translation_resource_id IN (SELECT id FROM translation_resources)
    `);

    await AppDataSource.query(`DELETE FROM translation_revisions`);
    await AppDataSource.query(`DELETE FROM translation_resources`);

    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
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
        name: 'Localization API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedLocalizationPermissions(): Promise<void> {
    await ensurePermission('localization.read', 'Read localization');
    await ensurePermission('localization.manage', 'Manage localization');
    await ensurePermission('localization.approve', 'Approve localization');
    await ensureRole();
  }

  async function createUserWithPermissions(
    localPart: string,
    permissions: readonly string[],
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedLocalizationPermissions();

    for (const permission of permissions) {
      await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, permission);
    }

    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  it('returns 401 for unauthenticated localization list requests', async () => {
    await request(getTestHttpServer(application)).get('/api/v1/localization/resources').expect(401);
  });

  it('returns 403 for authenticated users without localization.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    const response = await request(getTestHttpServer(application))
      .get('/api/v1/localization/resources')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect((response.body as ErrorResponseBody).statusCode).toBe(403);
  });

  it('returns 403 for read-only users attempting manage endpoints', async () => {
    const { accessToken } = await createUserWithPermissions('read-only', ['localization.read']);

    await request(getTestHttpServer(application))
      .post('/api/v1/localization/resources/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        resourceType: 'LEARNING_CONTENT_DOCUMENT',
        resourceId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(403);
  });

  it('allows parish-scoped manage users to list resources', async () => {
    const { accessToken, userId } = await createUserWithPermissions('parish-admin', [
      'localization.read',
      'localization.manage',
      'localization.approve',
    ]);

    const parishId = '22222222-2222-4222-8222-222222222222';

    await AppDataSource.query(
      `
        INSERT INTO parishes (id, code, name, status, created_at, updated_at)
        VALUES (@0, @1, @2, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
      `,
      [parishId, `${TEST_CODE_PREFIX}parish`, 'Localization Parish'],
    );
    await ensureTestParishMembership(userId, parishId);

    const response = await request(getTestHttpServer(application))
      .get('/api/v1/localization/resources')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as TranslationResourceListResponseBody;

    expect(body.page).toBe(1);
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('returns 403 for cross-parish resource detail access', async () => {
    const { accessToken, userId } = await createUserWithPermissions('cross-parish', [
      'localization.read',
    ]);
    const ownParishId = '33333333-3333-4333-8333-333333333333';
    const otherParishId = '44444444-4444-4444-8444-444444444444';
    const resourceId = '55555555-5555-4555-8555-555555555555';

    await AppDataSource.query(
      `
        INSERT INTO parishes (id, code, name, status, created_at, updated_at)
        VALUES (@0, @1, @2, 'ACTIVE', GETUTCDATE(), GETUTCDATE()),
               (@3, @4, @5, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
      `,
      [
        ownParishId,
        `${TEST_CODE_PREFIX}own`,
        'Own Parish',
        otherParishId,
        `${TEST_CODE_PREFIX}other`,
        'Other Parish',
      ],
    );
    await ensureTestParishMembership(userId, ownParishId);

    await AppDataSource.query(
      `
        INSERT INTO translation_resources (
          id, resource_type, resource_id, parish_id, source_locale, created_at, updated_at
        )
        VALUES (@0, 'LEARNING_CONTENT_DOCUMENT', @1, @2, 'vi-VN', GETUTCDATE(), GETUTCDATE())
      `,
      [resourceId, '66666666-6666-4666-8666-666666666666', otherParishId],
    );

    await request(getTestHttpServer(application))
      .get(`/api/v1/localization/resources/${resourceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
