import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { CurriculumStatus } from '../src/modules/curriculum/enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../src/modules/curriculum/enums/curriculum-version-status.enum';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'cur003-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CUR003_TESTER';
const TEST_CODE_PREFIX = 'cur003-e2e-';

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

interface CatechismLevelResponseBody {
  id: string;
  parishId: string;
  code: string;
  name: string;
  sortOrder: number;
  status: string;
}

interface CurriculumResponseBody {
  id: string;
  parishId: string;
  catechismLevelId: string;
  code: string;
  name: string;
  status: CurriculumStatus;
  sourceLocale: string;
}

interface CurriculumVersionResponseBody {
  id: string;
  curriculumId: string;
  versionNumber: number;
  status: CurriculumVersionStatus;
  label: string | null;
}

interface TopicResponseBody {
  id: string;
  curriculumVersionId: string;
  title: string;
  sortOrder: number;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Curriculum API (db e2e)', () => {
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
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (SELECT id FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM catechism_levels
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
        name: 'Curriculum API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedCurriculumPermissions(): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('curricula.read', 'Read curricula');
    await ensurePermission('curricula.manage', 'Manage curricula');
    await ensurePermission('curricula.publish', 'Publish curricula');
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

  async function setupManageUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedCurriculumPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.publish');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  async function setupReadUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedCurriculumPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  it('returns 401 for unauthenticated curriculum list requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/curricula')
      .expect(401);
  });

  it('returns 403 for authenticated users without curricula.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/curricula')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows curricula.manage to create, update, change status, version, and manage topics', async () => {
    const { accessToken, userId } = await setupManageUser('manage');
    const parish = await createParish(accessToken, 'manage');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-manage');

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}cur-manage`,
        name: 'Giáo lý Khai Tâm',
        sourceLocale: 'vi-VN',
      })
      .expect(201);

    const created = createResponse.body as CurriculumResponseBody;
    expect(created.status).toBe(CurriculumStatus.Active);
    expect(created.sourceLocale).toBe('vi-VN');

    const updateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/curricula/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Giáo lý Khai Tâm Updated' })
      .expect(200);

    expect((updateResponse.body as CurriculumResponseBody).name).toBe('Giáo lý Khai Tâm Updated');

    const statusResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/curricula/${created.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: CurriculumStatus.Inactive })
      .expect(200);

    expect((statusResponse.body as CurriculumResponseBody).status).toBe(CurriculumStatus.Inactive);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/curricula/${created.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: CurriculumStatus.Active })
      .expect(200);

    const versionResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curricula/${created.id}/versions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ label: 'Draft v1' })
      .expect(201);

    const version = versionResponse.body as CurriculumVersionResponseBody;
    expect(version.status).toBe(CurriculumVersionStatus.Draft);
    expect(version.label).toBe('Draft v1');

    const topicAResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Chủ đề A', sortOrder: 0 })
      .expect(201);

    const topicBResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Chủ đề B', sortOrder: 1 })
      .expect(201);

    const topicA = topicAResponse.body as TopicResponseBody;
    const topicB = topicBResponse.body as TopicResponseBody;

    const reorderResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/curriculum-versions/${version.id}/topics/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ topicIds: [topicB.id, topicA.id] })
      .expect(200);

    const reordered = (reorderResponse.body as { items: TopicResponseBody[] }).items;
    expect(reordered.map((topic) => topic.title)).toEqual(['Chủ đề B', 'Chủ đề A']);

    await request(getTestHttpServer(application))
      .delete(`/api/v1/topics/${topicA.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('allows curricula.read to list and get curricula with parish membership scope', async () => {
    const { accessToken: manageToken, userId: manageUserId } = await setupManageUser('read-setup');
    const parish = await createParish(manageToken, 'read');
    await ensureTestParishMembership(manageUserId, parish.id);
    const catechismLevel = await createCatechismLevel(manageToken, parish.id, 'level-read');

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}cur-read`,
        name: 'Readable Curriculum',
        sourceLocale: 'vi-VN',
      })
      .expect(201);

    const created = createResponse.body as CurriculumResponseBody;

    const { accessToken: readToken, userId: readUserId } = await setupReadUser('read-only');
    await ensureTestParishMembership(readUserId, parish.id);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);

    expect((listResponse.body as { total: number }).total).toBe(1);

    await request(getTestHttpServer(application))
      .get(`/api/v1/curricula/${created.id}`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
  });

  it('returns 403 for read-only users attempting curriculum mutations', async () => {
    const email = buildTestEmail('read-mutate');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedCurriculumPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .post('/api/v1/parishes/11111111-1111-4111-8111-111111111111/curricula')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: '22222222-2222-4222-8222-222222222222',
        code: `${TEST_CODE_PREFIX}read-mutate`,
        name: 'Read Only',
        sourceLocale: 'vi-VN',
      })
      .expect(403);
  });

  it('returns 400 for invalid source locale', async () => {
    const { accessToken, userId } = await setupManageUser('invalid-locale');
    const parish = await createParish(accessToken, 'invalid-locale');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-invalid');

    const invalidResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}cur-invalid`,
        name: 'Invalid Locale Curriculum',
        sourceLocale: 'not-a-locale',
      })
      .expect(400);

    expect((invalidResponse.body as ErrorResponseBody).statusCode).toBe(400);
  });

  it('returns 409 for duplicate curriculum codes within parish and catechism level', async () => {
    const { accessToken, userId } = await setupManageUser('duplicate');
    const parish = await createParish(accessToken, 'duplicate');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-dup');
    const duplicateCode = `${TEST_CODE_PREFIX}dup-cur`;

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: duplicateCode,
        name: 'First Curriculum',
        sourceLocale: 'vi-VN',
      })
      .expect(201);

    const duplicateResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: duplicateCode,
        name: 'Second Curriculum',
        sourceLocale: 'vi-VN',
      })
      .expect(409);

    expect((duplicateResponse.body as ErrorResponseBody).statusCode).toBe(409);
  });
});
