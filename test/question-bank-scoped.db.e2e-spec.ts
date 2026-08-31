import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_RBAC_ROLE_PERMISSION_MATRIX } from '../src/database/seeds/auth-rbac.seed.constants';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { QuestionDifficulty } from '../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'qb006-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_SETUP_ROLE_CODE = 'QB006_SETUP';
const TEST_CODE_PREFIX = 'qb006-e2e-';

interface LoginResponseBody {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface ParishResponseBody {
  id: string;
}

interface CreateQuestionResponseBody {
  question: { id: string };
  initialVersion: { id: string };
}

interface QuestionOptionListResponseBody {
  items: Array<{ id: string; text: string | null; sortOrder: number }>;
}

interface QuestionVersionPreviewResponseBody {
  questionVersionId: string;
  questionType: QuestionType;
  prompt: string;
  options: Array<{ id: string; text: string | null }>;
  correctOptionIds?: string[];
  explanation?: string | null;
}

describe('Question Bank scoped delivery API (db e2e)', () => {
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
      DELETE FROM question_correct_options
      WHERE question_version_id IN (
        SELECT id FROM question_versions
        WHERE question_id IN (
          SELECT id FROM questions WHERE parish_id IN (
            SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
          )
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_options
      WHERE question_version_id IN (
        SELECT id FROM question_versions
        WHERE question_id IN (
          SELECT id FROM questions WHERE parish_id IN (
            SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
          )
        )
      )
    `);

    await AppDataSource.query(`
      UPDATE questions
      SET current_published_version_id = NULL
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM question_versions
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM questions
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
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
      WHERE role_id IN (SELECT id FROM roles WHERE code = '${TEST_SETUP_ROLE_CODE}')
    `);

    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM roles
      WHERE code = '${TEST_SETUP_ROLE_CODE}'
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

  async function ensureRole(roleCode: string, roleName: string): Promise<void> {
    try {
      await accessControlService.createRole({ code: roleCode, name: roleName });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function ensureRolePermissions(
    roleCode: string,
    permissions: readonly string[],
  ): Promise<void> {
    for (const permissionCode of permissions) {
      await ensurePermission(permissionCode, permissionCode);
      await accessControlService.assignPermissionToRole(roleCode, permissionCode);
    }
  }

  async function ensureDeliveryRoles(): Promise<void> {
    await ensureRole('CATECHIST', 'Catechist');
    await ensureRole('PARENT', 'Parent');
    await ensureRole('SUPER_ADMIN', 'Super Admin');
    await ensureRolePermissions('CATECHIST', AUTH_RBAC_ROLE_PERMISSION_MATRIX['CATECHIST'] ?? []);
    await ensureRolePermissions('PARENT', AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARENT'] ?? []);
    await ensureRolePermissions(
      'SUPER_ADMIN',
      AUTH_RBAC_ROLE_PERMISSION_MATRIX['SUPER_ADMIN'] ?? [],
    );
  }

  async function ensureSetupRole(): Promise<void> {
    await ensureRole(TEST_SETUP_ROLE_CODE, 'Question Bank Scoped Setup');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('questions.read', 'Read questions');
    await ensurePermission('questions.manage', 'Manage questions');
    await ensurePermission('questions.publish', 'Publish questions');
    await accessControlService.assignPermissionToRole(TEST_SETUP_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_SETUP_ROLE_CODE, 'questions.read');
    await accessControlService.assignPermissionToRole(TEST_SETUP_ROLE_CODE, 'questions.manage');
    await accessControlService.assignPermissionToRole(TEST_SETUP_ROLE_CODE, 'questions.publish');
  }

  async function setupManageUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await ensureSetupRole();
    await accessControlService.assignRoleToUser(account.id, TEST_SETUP_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  async function createRoleUser(
    localPart: string,
    roleCode: 'CATECHIST' | 'PARENT' | 'SUPER_ADMIN',
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await ensureDeliveryRoles();
    await accessControlService.assignRoleToUser(account.id, roleCode);

    return { accessToken: await login(email), userId: account.id };
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

  async function createDraftQuestion(
    accessToken: string,
    parishId: string,
  ): Promise<CreateQuestionResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parishId}/questions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}question`,
        sourceLocale: 'vi-VN',
        draft: {
          questionType: QuestionType.SingleChoice,
          prompt: 'Which sacrament begins Christian life?',
          difficulty: QuestionDifficulty.Easy,
        },
      })
      .expect(201);

    return response.body as CreateQuestionResponseBody;
  }

  async function publishQuestionVersion(
    accessToken: string,
    versionId: string,
  ): Promise<{ publishedVersionId: string; optionIds: string[] }> {
    const replaceResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { text: 'Baptism', sortOrder: 1 },
          { text: 'Confirmation', sortOrder: 2 },
        ],
      })
      .expect(200);

    const options = (replaceResponse.body as QuestionOptionListResponseBody).items;
    const firstOption = options[0];
    expect(firstOption).toBeDefined();

    await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/correct-options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ optionIds: [firstOption.id] })
      .expect(200);

    const publishResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${versionId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const published = publishResponse.body as { id: string };

    return {
      publishedVersionId: published.id,
      optionIds: options.map((option) => option.id),
    };
  }

  it('allows CATECHIST to read questions and preview in own parish', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('catechist-setup');
    const parish = await createParish(setupToken, 'catechist-own');
    await ensureTestParishMembership(setupUserId, parish.id);

    const created = await createDraftQuestion(setupToken, parish.id);
    const published = await publishQuestionVersion(setupToken, created.initialVersion.id);

    const catechist = await createRoleUser('catechist-own', 'CATECHIST');
    await ensureTestParishMembership(catechist.userId, parish.id);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .expect(200);

    const previewResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${published.publishedVersionId}/preview`)
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .expect(200);

    const preview = previewResponse.body as QuestionVersionPreviewResponseBody;
    expect(preview.questionVersionId).toBe(published.publishedVersionId);
    expect(preview).not.toHaveProperty('correctOptionIds');
    expect(preview).not.toHaveProperty('explanation');
  });

  it('denies CATECHIST manage and publish on question routes', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('catechist-deny-setup');
    const parish = await createParish(setupToken, 'catechist-deny');
    await ensureTestParishMembership(setupUserId, parish.id);

    const created = await createDraftQuestion(setupToken, parish.id);

    const catechist = await createRoleUser('catechist-deny-user', 'CATECHIST');
    await ensureTestParishMembership(catechist.userId, parish.id);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/question-versions/${created.initialVersion.id}`)
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .send({ prompt: 'Updated by catechist' })
      .expect(403);

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${created.initialVersion.id}/publish`)
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .expect(403);
  });

  it('denies cross-parish question read and preview', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('cross-parish');
    const parishA = await createParish(setupToken, 'parish-a');
    const parishB = await createParish(setupToken, 'parish-b');
    await ensureTestParishMembership(setupUserId, parishA.id);
    await ensureTestParishMembership(setupUserId, parishB.id);

    const created = await createDraftQuestion(setupToken, parishA.id);
    const published = await publishQuestionVersion(setupToken, created.initialVersion.id);

    const catechistB = await createRoleUser('cross-parish-catechist', 'CATECHIST');
    await ensureTestParishMembership(catechistB.userId, parishB.id);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parishA.id}/questions`)
      .set('Authorization', `Bearer ${catechistB.accessToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${published.publishedVersionId}/preview`)
      .set('Authorization', `Bearer ${catechistB.accessToken}`)
      .expect(403);
  });

  it('denies PARENT access to question routes', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('parent-deny-setup');
    const parish = await createParish(setupToken, 'parent-deny');
    await ensureTestParishMembership(setupUserId, parish.id);

    const created = await createDraftQuestion(setupToken, parish.id);
    const published = await publishQuestionVersion(setupToken, created.initialVersion.id);

    const parent = await createRoleUser('parent-deny-user', 'PARENT');
    await ensureTestParishMembership(parent.userId, parish.id);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${parent.accessToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${published.publishedVersionId}/preview`)
      .set('Authorization', `Bearer ${parent.accessToken}`)
      .expect(403);
  });

  it('allows SUPER_ADMIN to preview draft versions without answer leakage', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('super-admin');
    const parish = await createParish(setupToken, 'super-admin');
    await ensureTestParishMembership(setupUserId, parish.id);

    const created = await createDraftQuestion(setupToken, parish.id);

    const superAdmin = await createRoleUser('super-admin-user', 'SUPER_ADMIN');

    const previewResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${created.initialVersion.id}/preview`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .expect(200);

    const preview = previewResponse.body as QuestionVersionPreviewResponseBody;
    expect(preview.questionVersionId).toBe(created.initialVersion.id);
    expect(preview).not.toHaveProperty('correctOptionIds');
    expect(preview).not.toHaveProperty('explanation');
    for (const option of preview.options) {
      expect(option).not.toHaveProperty('code');
    }
  });

  it('does not expose a public grading HTTP route', async () => {
    const { accessToken, userId } = await setupManageUser('no-grade-http');
    const parish = await createParish(accessToken, 'no-grade-http');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const published = await publishQuestionVersion(accessToken, created.initialVersion.id);

    const firstPublishedOptionId = published.optionIds[0];
    expect(firstPublishedOptionId).toBeDefined();

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/grade`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedOptionIds: [firstPublishedOptionId] })
      .expect(404);
  });
});
