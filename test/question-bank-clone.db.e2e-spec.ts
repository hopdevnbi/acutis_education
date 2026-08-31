import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { QuestionDifficulty } from '../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionStatus } from '../src/modules/question-bank/enums/question-status.enum';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../src/modules/question-bank/enums/question-version-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'qb005-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'QB005_TESTER';
const TEST_CODE_PREFIX = 'qb005-e2e-';

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

interface QuestionAuthoringResponseBody {
  version: {
    id: string;
    status: QuestionVersionStatus;
    versionNumber: number;
    sourceContentHash: string | null;
  };
  options: Array<{ id: string }>;
  correctOptionIds: string[];
}

describe('Question Bank clone API (db e2e)', () => {
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
        name: 'Question Bank Clone Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedPermissions(includePublish: boolean): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('questions.read', 'Read questions');
    await ensurePermission('questions.manage', 'Manage questions');

    if (includePublish) {
      await ensurePermission('questions.publish', 'Publish questions');
    }

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

  async function setupManageUser(
    localPart: string,
    includePublish: boolean,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissions(includePublish);
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.manage');

    if (includePublish) {
      await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'questions.publish');
    }

    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
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
  ): Promise<{
    publishedVersionId: string;
    sourceContentHash: string | null;
    optionIds: string[];
  }> {
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

    const published = publishResponse.body as {
      id: string;
      sourceContentHash: string | null;
    };

    return {
      publishedVersionId: published.id,
      sourceContentHash: published.sourceContentHash,
      optionIds: options.map((option) => option.id),
    };
  }

  it('requires authentication to clone a published version', async () => {
    const { accessToken, userId } = await setupManageUser('clone-auth', true);
    const parish = await createParish(accessToken, 'clone-auth');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const published = await publishQuestionVersion(accessToken, created.initialVersion.id);

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/clone-to-draft`)
      .expect(401);
  });

  it('clones a published version and returns authoring snapshot', async () => {
    const { accessToken, userId } = await setupManageUser('clone-success', true);
    const parish = await createParish(accessToken, 'clone-success');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const published = await publishQuestionVersion(accessToken, created.initialVersion.id);

    const cloneResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/clone-to-draft`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const cloned = cloneResponse.body as QuestionAuthoringResponseBody;

    expect(cloned.version.status).toBe(QuestionVersionStatus.Draft);
    expect(cloned.version.versionNumber).toBe(2);
    expect(cloned.options).toHaveLength(2);
    expect(cloned.options.map((option) => option.id)).not.toEqual(published.optionIds);
    expect(cloned.correctOptionIds).toHaveLength(1);
    expect(cloned.version.sourceContentHash).toBe(published.sourceContentHash);

    const authoringResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${cloned.version.id}/authoring`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const authoring = authoringResponse.body as QuestionAuthoringResponseBody;
    expect(authoring.version.id).toBe(cloned.version.id);
    expect(authoring.options).toHaveLength(2);
  });

  it('returns 409 when a draft already exists', async () => {
    const { accessToken, userId } = await setupManageUser('clone-conflict', true);
    const parish = await createParish(accessToken, 'clone-conflict');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const published = await publishQuestionVersion(accessToken, created.initialVersion.id);

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/clone-to-draft`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/clone-to-draft`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('rejects clone when question root is inactive', async () => {
    const { accessToken, userId } = await setupManageUser('clone-inactive', true);
    const parish = await createParish(accessToken, 'clone-inactive');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const published = await publishQuestionVersion(accessToken, created.initialVersion.id);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/questions/${created.question.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: QuestionStatus.Inactive })
      .expect(200);

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${published.publishedVersionId}/clone-to-draft`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('does not expose a public grading HTTP endpoint', async () => {
    const { accessToken, userId } = await setupManageUser('no-grade-http', true);
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
