import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { CurriculumVersionStatus } from '../src/modules/curriculum/enums/curriculum-version-status.enum';
import { ParishStatus } from '../src/modules/parish/enums/parish-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'cur004-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CUR004_TESTER';
const TEST_READ_ONLY_ROLE_CODE = 'CUR004_READ_ONLY';
const TEST_CODE_PREFIX = 'cur004-e2e-';

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
  status: string;
}

interface CurriculumResponseBody {
  id: string;
  parishId: string;
  catechismLevelId: string;
  code: string;
  name: string;
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

interface LessonResponseBody {
  id: string;
  topicId: string;
  curriculumVersionId: string;
  canonicalLessonKey: string;
  title: string;
  sortOrder: number;
}

interface LessonContentResponseBody {
  id: string;
  lessonId: string;
  contentHash: string | null;
  document: {
    schemaVersion: number;
    blocks: Record<string, unknown>[];
  };
}

interface VersionTreeResponseBody {
  version: CurriculumVersionResponseBody;
  topics: Array<{
    id: string;
    title: string;
    sortOrder: number;
    lessons: Array<{
      id: string;
      title: string;
      sortOrder: number;
      canonicalLessonKey: string;
    }>;
  }>;
}

interface CurriculumAssignmentResponseBody {
  id: string;
  parishId: string;
  academicYearId: string;
  catechismLevelId: string;
  curriculumVersionId: string;
}

interface PublishValidationErrorBody {
  statusCode: number;
  message: string;
}

const sampleContentDocument = {
  schemaVersion: 1,
  blocks: [
    { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
    { type: 'paragraph', text: 'Nội dung bài học mẫu.' },
  ],
};

describe('Curriculum lesson content API (db e2e)', () => {
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
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

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
      DELETE FROM academic_years
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
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
      WHERE role_id IN (SELECT id FROM roles WHERE code IN ('${TEST_ROLE_CODE}', '${TEST_READ_ONLY_ROLE_CODE}'))
    `);

    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM roles
      WHERE code IN ('${TEST_ROLE_CODE}', '${TEST_READ_ONLY_ROLE_CODE}')
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
        name: 'Curriculum Content API Tester',
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
    await ensurePermission('academic-years.read', 'Read academic years');
    await ensurePermission('academic-years.manage', 'Manage academic years');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('curricula.read', 'Read curricula');
    await ensurePermission('curricula.manage', 'Manage curricula');
    await ensurePermission('curricula.publish', 'Publish curricula');
    await ensurePermission('lesson-content.read', 'Read lesson content');
    await ensurePermission('lesson-content.manage', 'Manage lesson content');
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

  async function createAcademicYear(
    accessToken: string,
    parishId: string,
    suffix: string,
  ): Promise<AcademicYearResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parishId}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}${suffix}`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);

    return response.body as AcademicYearResponseBody;
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
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.publish');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'lesson-content.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'lesson-content.manage');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  async function seedDraftCurriculum(
    accessToken: string,
    parishId: string,
    catechismLevelId: string,
    suffix: string,
  ): Promise<{ curriculum: CurriculumResponseBody; version: CurriculumVersionResponseBody }> {
    const createResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parishId}/curricula`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechismLevelId,
        code: `${TEST_CODE_PREFIX}cur-${suffix}`,
        name: `Curriculum ${suffix}`,
        sourceLocale: 'vi-VN',
      })
      .expect(201);

    const curriculum = createResponse.body as CurriculumResponseBody;

    const versionResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curricula/${curriculum.id}/versions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ label: `Draft ${suffix}` })
      .expect(201);

    return { curriculum, version: versionResponse.body as CurriculumVersionResponseBody };
  }

  it('returns 401 for unauthenticated lesson content requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/lessons/11111111-1111-4111-8111-111111111111/content')
      .expect(401);
  });

  it('returns 403 for authenticated users without lesson-content.read', async () => {
    const email = buildTestEmail('no-content-read');
    await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    const accessToken = await login(email);

    await request(getTestHttpServer(application))
      .get('/api/v1/lessons/11111111-1111-4111-8111-111111111111/content')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('supports lesson CRUD, content PUT/GET, publish, clone, assignment, and tree', async () => {
    const { accessToken, userId } = await setupManageUser('full-flow');
    const parish = await createParish(accessToken, 'full-flow');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-full');
    const academicYear = await createAcademicYear(accessToken, parish.id, 'year-full');
    const { version } = await seedDraftCurriculum(
      accessToken,
      parish.id,
      catechismLevel.id,
      'full-flow',
    );

    const topicResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Chủ đề A', sortOrder: 0 })
      .expect(201);

    const topic = topicResponse.body as TopicResponseBody;

    const lessonAResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bài học A', sortOrder: 0, estimatedDurationMinutes: 45 })
      .expect(201);

    const lessonBResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bài học B', sortOrder: 1, estimatedDurationMinutes: 30 })
      .expect(201);

    const lessonA = lessonAResponse.body as LessonResponseBody;
    const lessonB = lessonBResponse.body as LessonResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/lessons/${lessonA.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bài học A — cập nhật' })
      .expect(200);

    const reorderResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/topics/${topic.id}/lessons/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lessonIds: [lessonB.id, lessonA.id] })
      .expect(200);

    expect((reorderResponse.body as { items: LessonResponseBody[] }).items[0]?.title).toBe(
      'Bài học B',
    );

    const contentPutResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lessonA.id}/content`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ document: sampleContentDocument })
      .expect(200);

    const upsertedContent = contentPutResponse.body as LessonContentResponseBody;
    expect(upsertedContent.contentHash).toBeTruthy();

    const contentGetResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/lessons/${lessonA.id}/content`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((contentGetResponse.body as LessonContentResponseBody).contentHash).toBe(
      upsertedContent.contentHash,
    );

    await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lessonB.id}/content`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ document: sampleContentDocument })
      .expect(200);

    const publishResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((publishResponse.body as CurriculumVersionResponseBody).status).toBe(
      CurriculumVersionStatus.Published,
    );

    await request(getTestHttpServer(application))
      .patch(`/api/v1/topics/${topic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Chủ đề sau publish' })
      .expect(409);

    await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lessonA.id}/content`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ document: sampleContentDocument })
      .expect(409);

    const treeResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/curriculum-versions/${version.id}/tree`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const tree = treeResponse.body as VersionTreeResponseBody;
    expect(tree.topics).toHaveLength(1);
    expect(tree.topics[0]?.lessons).toHaveLength(2);

    const cloneResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/clone-to-draft`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const clonedVersion = cloneResponse.body as CurriculumVersionResponseBody;
    expect(clonedVersion.status).toBe(CurriculumVersionStatus.Draft);

    const clonedTreeResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/curriculum-versions/${clonedVersion.id}/tree`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const clonedTree = clonedTreeResponse.body as VersionTreeResponseBody;
    expect(clonedTree.topics[0]?.lessons[0]?.canonicalLessonKey.toLowerCase()).toBe(
      lessonB.canonicalLessonKey.toLowerCase(),
    );

    const assignmentResponse = await request(getTestHttpServer(application))
      .put(
        `/api/v1/parishes/${parish.id}/academic-years/${academicYear.id}/catechism-levels/${catechismLevel.id}/curriculum-assignment`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ curriculumVersionId: version.id })
      .expect(200);

    expect(
      (
        assignmentResponse.body as CurriculumAssignmentResponseBody
      ).curriculumVersionId.toLowerCase(),
    ).toBe(version.id.toLowerCase());

    await request(getTestHttpServer(application))
      .get(
        `/api/v1/parishes/${parish.id}/academic-years/${academicYear.id}/catechism-levels/${catechismLevel.id}/curriculum-assignment`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('returns 422 when publish validation fails for missing content', async () => {
    const { accessToken, userId } = await setupManageUser('publish-422');
    const parish = await createParish(accessToken, 'publish-422');
    await ensureTestParishMembership(userId, parish.id);
    const catechismLevel = await createCatechismLevel(accessToken, parish.id, 'level-422');
    const { version } = await seedDraftCurriculum(
      accessToken,
      parish.id,
      catechismLevel.id,
      'publish-422',
    );

    const topicResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Chủ đề thiếu nội dung', sortOrder: 0 })
      .expect(201);

    const topic = topicResponse.body as TopicResponseBody;

    await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Bài thiếu nội dung', sortOrder: 0, estimatedDurationMinutes: 45 })
      .expect(201);

    const publishResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(422);

    const body = publishResponse.body as PublishValidationErrorBody;
    expect(body.statusCode).toBe(422);
    expect(body.message).toContain('validation issues');
  });

  it('returns 403 for read-only users attempting lesson mutations', async () => {
    const { accessToken: manageToken, userId: manageUserId } = await setupManageUser('read-setup');
    const parish = await createParish(manageToken, 'read-setup');
    await ensureTestParishMembership(manageUserId, parish.id);
    const catechismLevel = await createCatechismLevel(manageToken, parish.id, 'level-read');
    const { version } = await seedDraftCurriculum(
      manageToken,
      parish.id,
      catechismLevel.id,
      'read-setup',
    );

    const topicResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ title: 'Chủ đề read', sortOrder: 0 })
      .expect(201);

    const topic = topicResponse.body as TopicResponseBody;

    const lessonResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ title: 'Bài read', sortOrder: 0, estimatedDurationMinutes: 45 })
      .expect(201);

    const lesson = lessonResponse.body as LessonResponseBody;

    await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lesson.id}/content`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ document: sampleContentDocument })
      .expect(200);

    const readEmail = buildTestEmail('read-only-mutate');
    const readAccount = await userAccountService.createAccount({
      email: readEmail,
      password: TEST_PASSWORD,
    });
    await seedCurriculumPermissions();
    try {
      await accessControlService.createRole({
        code: TEST_READ_ONLY_ROLE_CODE,
        name: 'Curriculum Content Read Only',
      });
    } catch (error: unknown) {
      if (!(error instanceof RoleCodeAlreadyExistsError)) {
        throw error;
      }
    }
    await accessControlService.assignPermissionToRole(TEST_READ_ONLY_ROLE_CODE, 'curricula.read');
    await accessControlService.assignPermissionToRole(
      TEST_READ_ONLY_ROLE_CODE,
      'lesson-content.read',
    );
    await accessControlService.assignRoleToUser(readAccount.id, TEST_READ_ONLY_ROLE_CODE);
    const readToken = await login(readEmail);
    await ensureTestParishMembership(readAccount.id, parish.id);

    await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${readToken}`)
      .send({ title: 'Forbidden lesson', sortOrder: 1, estimatedDurationMinutes: 45 })
      .expect(403);

    await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lesson.id}/content`)
      .set('Authorization', `Bearer ${readToken}`)
      .send({ document: sampleContentDocument })
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/lessons/${lesson.id}/content`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
  });
});
