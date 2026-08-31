import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_RBAC_ROLE_PERMISSION_MATRIX } from '../src/database/seeds/auth-rbac.seed.constants';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../src/modules/question-bank/constants/question-import.constants';
import { QuestionDifficulty } from '../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'qb007-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_SETUP_ROLE_CODE = 'QB007_SETUP';
const TEST_CODE_PREFIX = 'qb007-e2e-';

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

interface QuestionExportPackageResponseBody {
  schemaVersion: number;
  sourceQuestionCode: string | null;
  correctOptionKeys: string[];
}

interface QuestionImportValidationResponseBody {
  valid: boolean;
  issues: Array<{ code: string }>;
}

describe('Question Bank search/export API (db e2e)', () => {
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
    await ensureRolePermissions('CATECHIST', AUTH_RBAC_ROLE_PERMISSION_MATRIX['CATECHIST'] ?? []);
    await ensureRolePermissions('PARENT', AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARENT'] ?? []);
  }

  async function ensureSetupRole(): Promise<void> {
    await ensureRole(TEST_SETUP_ROLE_CODE, 'Question Bank Search Setup');
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
    roleCode: 'CATECHIST' | 'PARENT',
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
          prompt: 'Câu hỏi về Bí tích',
          difficulty: QuestionDifficulty.Easy,
        },
      })
      .expect(201);

    return response.body as CreateQuestionResponseBody;
  }

  async function publishQuestionVersion(
    accessToken: string,
    versionId: string,
  ): Promise<{ publishedVersionId: string }> {
    const replaceResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { code: 'a', text: 'Đáp án A', sortOrder: 1 },
          { code: 'b', text: 'Đáp án B', sortOrder: 2 },
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

    return { publishedVersionId: (publishResponse.body as { id: string }).id };
  }

  it('allows CATECHIST to search questions in own parish', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('search-own');
    const parish = await createParish(setupToken, 'search-own');
    await ensureTestParishMembership(setupUserId, parish.id);
    await createDraftQuestion(setupToken, parish.id);

    const catechist = await createRoleUser('search-own-catechist', 'CATECHIST');
    await ensureTestParishMembership(catechist.userId, parish.id);

    const response = await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/questions`)
      .query({ search: 'Bí tích', hasDraft: true })
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .expect(200);

    expect((response.body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  it('denies PARENT and cross-parish search', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('search-deny');
    const parishA = await createParish(setupToken, 'search-a');
    const parishB = await createParish(setupToken, 'search-b');
    await ensureTestParishMembership(setupUserId, parishA.id);
    await ensureTestParishMembership(setupUserId, parishB.id);

    const parent = await createRoleUser('search-parent', 'PARENT');
    await ensureTestParishMembership(parent.userId, parishA.id);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parishA.id}/questions`)
      .set('Authorization', `Bearer ${parent.accessToken}`)
      .expect(403);

    const catechistB = await createRoleUser('search-cross', 'CATECHIST');
    await ensureTestParishMembership(catechistB.userId, parishB.id);

    await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parishA.id}/questions`)
      .set('Authorization', `Bearer ${catechistB.accessToken}`)
      .expect(403);
  });

  it('allows export read and manage-only import validate', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('export-import');
    const parish = await createParish(setupToken, 'export-import');
    await ensureTestParishMembership(setupUserId, parish.id);

    const created = await createDraftQuestion(setupToken, parish.id);
    const published = await publishQuestionVersion(setupToken, created.initialVersion.id);

    const exportResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${published.publishedVersionId}/export`)
      .set('Authorization', `Bearer ${setupToken}`)
      .expect(200);

    const exportPackage = exportResponse.body as QuestionExportPackageResponseBody;
    expect(exportPackage.schemaVersion).toBe(QUESTION_EXPORT_SCHEMA_VERSION);
    expect(exportPackage.correctOptionKeys).toEqual(['a']);

    const validateResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/question-imports/validate`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        ...exportPackage,
        sourceQuestionCode: `${TEST_CODE_PREFIX}import-copy`,
      })
      .expect(200);

    expect((validateResponse.body as QuestionImportValidationResponseBody).valid).toBe(true);
  });

  it('denies CATECHIST import validate and rejects invalid packages', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('import-deny-setup');
    const parish = await createParish(setupToken, 'import-deny');
    await ensureTestParishMembership(setupUserId, parish.id);

    const catechist = await createRoleUser('import-deny-catechist', 'CATECHIST');
    await ensureTestParishMembership(catechist.userId, parish.id);

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/question-imports/validate`)
      .set('Authorization', `Bearer ${catechist.accessToken}`)
      .send({
        schemaVersion: 99,
        sourceQuestionCode: 'invalid',
        sourceLocale: 'vi-VN',
        versionNumber: 1,
        questionType: QuestionType.SingleChoice,
        prompt: 'x',
        instruction: null,
        explanation: null,
        difficulty: QuestionDifficulty.Easy,
        promptMediaJson: null,
        explanationMediaJson: null,
        options: [],
        correctOptionKeys: [],
        tagCodes: [],
        curriculumLinks: [],
      })
      .expect(403);

    const invalidResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/question-imports/validate`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        schemaVersion: 99,
        sourceQuestionCode: 'invalid',
        sourceLocale: 'vi-VN',
        versionNumber: 1,
        questionType: QuestionType.SingleChoice,
        prompt: 'x',
        instruction: null,
        explanation: null,
        difficulty: QuestionDifficulty.Easy,
        promptMediaJson: null,
        explanationMediaJson: null,
        options: [
          { exportKey: 'a', code: 'a', text: 'A', mediaAssetId: null },
          { exportKey: 'b', code: 'b', text: 'B', mediaAssetId: null },
        ],
        correctOptionKeys: ['missing'],
        tagCodes: [],
        curriculumLinks: [],
      })
      .expect(200);

    expect((invalidResponse.body as QuestionImportValidationResponseBody).valid).toBe(false);
  });

  it('does not expose an import commit endpoint', async () => {
    const { accessToken, userId } = await setupManageUser('no-import-commit');
    const parish = await createParish(accessToken, 'no-import-commit');
    await ensureTestParishMembership(userId, parish.id);

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/question-imports`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(404);
  });
});
