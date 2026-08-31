import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { QuestionStatus } from '../src/modules/question-bank/enums/question-status.enum';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../src/modules/question-bank/enums/question-version-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'qb003-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'QB003_TESTER';
const TEST_CODE_PREFIX = 'qb003-e2e-';

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

interface QuestionResponseBody {
  id: string;
  parishId: string;
  code: string | null;
  status: QuestionStatus;
  sourceLocale: string;
}

interface CreateQuestionResponseBody {
  question: QuestionResponseBody;
  initialVersion: {
    id: string;
    questionId: string;
    versionNumber: number;
    status: QuestionVersionStatus;
    questionType: QuestionType;
    prompt: string;
  };
}

interface QuestionTagResponseBody {
  id: string;
  parishId: string;
  code: string;
  name: string;
  status: string;
}

interface QuestionCurriculumLinkResponseBody {
  id: string;
  questionId: string;
  parishId: string;
  curriculumId: string;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

describe('Question Bank API (db e2e)', () => {
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
      DELETE FROM question_curriculum_links
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_tag_links
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_tags
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
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
        name: 'Question Bank API Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedQuestionPermissions(): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('curricula.read', 'Read curricula');
    await ensurePermission('curricula.manage', 'Manage curricula');
    await ensurePermission('questions.read', 'Read questions');
    await ensurePermission('questions.manage', 'Manage questions');
    await ensurePermission('questions.publish', 'Publish questions');
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
    await seedQuestionPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.publish');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  async function setupReadUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedQuestionPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  it('returns 401 for unauthenticated question list requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/questions')
      .expect(401);
  });

  it('returns 403 for authenticated users without questions.read', async () => {
    const email = buildTestEmail('no-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/parishes/11111111-1111-4111-8111-111111111111/questions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows questions.manage to create, update, list, tag link, and curriculum link', async () => {
    const { accessToken, userId } = await setupManageUser('manage');
    const parish = await createParish(accessToken, 'manage');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-manage');

    const curriculumResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}cur-manage`,
        name: 'Giáo lý Khai Tâm',
        sourceLocale: 'vi-VN',
      })
      .expect(201);

    const curriculumId = (curriculumResponse.body as { id: string }).id;

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}q-manage`,
        sourceLocale: 'vi-VN',
        draft: {
          questionType: QuestionType.SingleChoice,
          prompt: 'Câu hỏi về Bí tích Rửa Tội?',
        },
      })
      .expect(201);

    const created = createResponse.body as CreateQuestionResponseBody;
    expect(created.question.status).toBe(QuestionStatus.Active);
    expect(created.question.sourceLocale).toBe('vi-VN');
    expect(created.initialVersion.status).toBe(QuestionVersionStatus.Draft);

    const updateResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/questions/${created.question.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: `${TEST_CODE_PREFIX}q-updated` })
      .expect(200);

    expect((updateResponse.body as QuestionResponseBody).code).toBe(`${TEST_CODE_PREFIX}q-updated`);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((listResponse.body as { total: number }).total).toBe(1);

    const tagResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/question-tags`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}tag-sacraments`,
        name: 'Bí tích',
      })
      .expect(201);

    const tag = tagResponse.body as QuestionTagResponseBody;

    await request(getTestHttpServer(application))
      .post(`/api/v1/questions/${created.question.id}/tags/${tag.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const tagsResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/questions/${created.question.id}/tags`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((tagsResponse.body as QuestionTagResponseBody[]).length).toBe(1);

    const linkResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/questions/${created.question.id}/curriculum-links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ curriculumId })
      .expect(201);

    const link = linkResponse.body as QuestionCurriculumLinkResponseBody;
    expect(link.curriculumId).toBe(curriculumId);

    const linksResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/questions/${created.question.id}/curriculum-links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      (linksResponse.body as { items: QuestionCurriculumLinkResponseBody[] }).items,
    ).toHaveLength(1);

    await request(getTestHttpServer(application))
      .delete(`/api/v1/question-curriculum-links/${link.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(getTestHttpServer(application))
      .delete(`/api/v1/questions/${created.question.id}/tags/${tag.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('allows questions.read to list and get questions with parish membership scope', async () => {
    const { accessToken: manageToken, userId: manageUserId } = await setupManageUser('read-setup');
    const parish = await createParish(manageToken, 'read');
    await ensureTestParishMembership(manageUserId, parish.id);

    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}q-read`,
        sourceLocale: 'vi-VN',
        draft: {
          questionType: QuestionType.TrueFalse,
          prompt: 'Readable question',
        },
      })
      .expect(201);

    const created = createResponse.body as CreateQuestionResponseBody;

    const { accessToken: readToken, userId: readUserId } = await setupReadUser('read-only');
    await ensureTestParishMembership(readUserId, parish.id);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);

    expect((listResponse.body as { total: number }).total).toBe(1);

    await request(getTestHttpServer(application))
      .get(`/api/v1/questions/${created.question.id}`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
  });

  it('returns 403 for read-only users attempting question mutations', async () => {
    const email = buildTestEmail('read-mutate');
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedQuestionPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .post('/api/v1/parishes/11111111-1111-4111-8111-111111111111/questions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceLocale: 'vi-VN',
        draft: { questionType: QuestionType.TrueFalse },
      })
      .expect(403);
  });

  it('returns 409 for duplicate question codes within parish', async () => {
    const { accessToken, userId } = await setupManageUser('duplicate');
    const parish = await createParish(accessToken, 'duplicate');
    await ensureTestParishMembership(userId, parish.id);
    const duplicateCode = `${TEST_CODE_PREFIX}dup-q`;

    await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: duplicateCode,
        sourceLocale: 'vi-VN',
        draft: { questionType: QuestionType.TrueFalse },
      })
      .expect(201);

    const duplicateResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/questions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: duplicateCode,
        sourceLocale: 'vi-VN',
        draft: { questionType: QuestionType.TrueFalse },
      })
      .expect(409);

    expect((duplicateResponse.body as ErrorResponseBody).statusCode).toBe(409);
  });
});
