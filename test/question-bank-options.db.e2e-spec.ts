import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { QuestionDifficulty } from '../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../src/modules/question-bank/enums/question-version-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'qb004-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'QB004_TESTER';
const TEST_CODE_PREFIX = 'qb004-e2e-';

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

interface PublishValidationErrorBody {
  statusCode: number;
  message: string | { message: string; issues?: Array<{ code: string }> };
  issues?: Array<{ code: string }>;
}

describe('Question Bank options and publish API (db e2e)', () => {
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
        name: 'Question Bank Options Tester',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
  }

  async function seedPermissions(): Promise<void> {
    await ensurePermission('parishes.read', 'Read parishes');
    await ensurePermission('parishes.manage', 'Manage parishes');
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

  async function setupManageUser(
    localPart: string,
    includePublish: boolean,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissions();
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

  it('replaces options, sets correct answers, and returns authoring snapshot', async () => {
    const { accessToken, userId } = await setupManageUser('options-manage', true);
    const parish = await createParish(accessToken, 'options');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const versionId = created.initialVersion.id;

    const replaceResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { code: 'baptism', text: 'Baptism', sortOrder: 1 },
          { code: 'confirmation', text: 'Confirmation', sortOrder: 2 },
        ],
      })
      .expect(200);

    const options = (replaceResponse.body as QuestionOptionListResponseBody).items;
    expect(options).toHaveLength(2);

    const firstOption = options[0];
    expect(firstOption).toBeDefined();

    await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/correct-options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ optionIds: [firstOption.id] })
      .expect(200);

    const authoringResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/question-versions/${versionId}/authoring`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const authoring = authoringResponse.body as {
      version: { id: string };
      options: Array<{ id: string }>;
      correctOptionIds: string[];
    };

    expect(authoring.options).toHaveLength(2);
    expect(authoring.correctOptionIds).toHaveLength(1);
  });

  it('returns 422 when publishing an incomplete draft version', async () => {
    const { accessToken, userId } = await setupManageUser('publish-invalid', true);
    const parish = await createParish(accessToken, 'publish-invalid');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);

    const publishResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${created.initialVersion.id}/publish`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(publishResponse.status).toBe(422);

    const body = publishResponse.body as PublishValidationErrorBody;
    const responseMessage = typeof body.message === 'string' ? body.message : body.message.message;

    expect(responseMessage).toContain('validation issues');
  });

  it('publishes a complete draft version', async () => {
    const { accessToken, userId } = await setupManageUser('publish-ok', true);
    const parish = await createParish(accessToken, 'publish-ok');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const versionId = created.initialVersion.id;

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
      status: QuestionVersionStatus;
      sourceContentHash: string | null;
    };
    expect(published.status).toBe(QuestionVersionStatus.Published);
    expect(published.sourceContentHash).not.toBeNull();
  });

  it('returns 403 when user lacks questions.publish permission', async () => {
    const { accessToken, userId } = await setupManageUser('publish-forbidden', false);
    const parish = await createParish(accessToken, 'publish-forbidden');
    await ensureTestParishMembership(userId, parish.id);

    const created = await createDraftQuestion(accessToken, parish.id);
    const versionId = created.initialVersion.id;

    const replaceResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/question-versions/${versionId}/options`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { text: 'True', sortOrder: 1 },
          { text: 'False', sortOrder: 2 },
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

    await request(getTestHttpServer(application))
      .post(`/api/v1/question-versions/${versionId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
