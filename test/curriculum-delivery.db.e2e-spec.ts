import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_RBAC_ROLE_PERMISSION_MATRIX } from '../src/database/seeds/auth-rbac.seed.constants';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { CatechistAssignmentRole } from '../src/modules/class/enums/catechist-assignment-role.enum';
import { ClassStatus } from '../src/modules/class/enums/class-status.enum';
import { CurriculumVersionStatus } from '../src/modules/curriculum/enums/curriculum-version-status.enum';
import { EnrollmentStatus } from '../src/modules/enrollment/enums/enrollment-status.enum';
import { GuardianRelationshipType } from '../src/modules/student/enums/guardian-relationship-type.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import type { ContentDocumentV1 } from '../src/modules/learning-content/interfaces/learning-content.interface';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import { ensureTestParishMembership } from './scoped-e2e-fixture';

const TEST_EMAIL_PREFIX = 'cur005-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CUR005_SETUP';
const TEST_CODE_PREFIX = 'cur005-e2e-';

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

interface AcademicYearResponseBody {
  id: string;
}

interface CatechismLevelResponseBody {
  id: string;
}

interface ClassResponseBody {
  id: string;
}

interface CurriculumResponseBody {
  id: string;
}

interface CurriculumVersionResponseBody {
  id: string;
  status: CurriculumVersionStatus;
}

interface TopicResponseBody {
  id: string;
}

interface LessonResponseBody {
  id: string;
  canonicalLessonKey: string;
}

interface EnrollmentResponseBody {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
}

interface StudentResponseBody {
  id: string;
}

interface LearnerCurriculumTreeResponseBody {
  version: { id: string };
  topics: Array<{
    lessons: Array<{ id: string; canonicalLessonKey: string }>;
  }>;
}

interface LearnerLessonContentResponseBody {
  lessonId: string;
  canonicalLessonKey: string;
  contentHash: string;
  sourceLocale: string;
}

interface VersionTreeResponseBody {
  topics: Array<{
    lessons: Array<{ id: string; canonicalLessonKey: string }>;
  }>;
}

const sampleContentDocument: ContentDocumentV1 = {
  schemaVersion: 1,
  blocks: [
    { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
    { type: 'paragraph', text: 'Nội dung bài học mẫu.' },
  ],
};

describe('Curriculum delivery API (db e2e)', () => {
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
      DELETE FROM student_guardians
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%'
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
      DELETE FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
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
      DELETE FROM media_assets
      WHERE created_by_user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
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
    await ensureRole('PARISH_ADMIN', 'Parish Admin');
    await ensureRolePermissions('CATECHIST', AUTH_RBAC_ROLE_PERMISSION_MATRIX['CATECHIST'] ?? []);
    await ensureRolePermissions('PARENT', AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARENT'] ?? []);
    await ensureRolePermissions(
      'PARISH_ADMIN',
      AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARISH_ADMIN'] ?? [],
    );
  }

  async function ensureSetupRole(): Promise<void> {
    await ensureRole(TEST_ROLE_CODE, 'Curriculum Delivery Setup');
    await ensurePermission('parishes.manage', 'Manage parishes');
    await ensurePermission('academic-years.manage', 'Manage academic years');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('classes.manage', 'Manage classes');
    await ensurePermission('students.manage', 'Manage students');
    await ensurePermission('student-guardians.manage', 'Manage student guardians');
    await ensurePermission('class-catechists.manage', 'Manage class catechists');
    await ensurePermission('enrollments.manage', 'Manage enrollments');
    await ensurePermission('curricula.read', 'Read curricula');
    await ensurePermission('curricula.manage', 'Manage curricula');
    await ensurePermission('curricula.publish', 'Publish curricula');
    await ensurePermission('lesson-content.read', 'Read lesson content');
    await ensurePermission('lesson-content.manage', 'Manage lesson content');
    await ensurePermission('media.upload', 'Upload media assets');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'students.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'student-guardians.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'class-catechists.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'enrollments.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'curricula.publish');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'lesson-content.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'lesson-content.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'media.upload');
  }

  async function setupManageUser(
    localPart: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await ensureSetupRole();
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return { accessToken: await login(email), userId: account.id };
  }

  async function createRoleUser(
    localPart: string,
    roleCode: 'CATECHIST' | 'PARENT' | 'PARISH_ADMIN',
  ): Promise<{ accessToken: string; userId: string }> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await ensureDeliveryRoles();
    await accessControlService.assignRoleToUser(account.id, roleCode);

    return { accessToken: await login(email), userId: account.id };
  }

  async function seedPublishedDeliveryFixture(
    setupToken: string,
    setupUserId: string,
    contentDocument: ContentDocumentV1 = sampleContentDocument,
  ): Promise<{
    parishId: string;
    classAId: string;
    classBId: string;
    lessonId: string;
    canonicalLessonKey: string;
    publishedVersionId: string;
    enrollmentId: string;
    studentId: string;
  }> {
    const parishResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}parish`,
        name: 'Delivery Parish',
      })
      .expect(201);
    const parish = parishResponse.body as ParishResponseBody;
    await ensureTestParishMembership(setupUserId, parish.id);

    const yearResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}year`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);
    const academicYear = yearResponse.body as AcademicYearResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/academic-years/${academicYear.id}/status`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ status: AcademicYearStatus.Active })
      .expect(200);

    const levelResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}level`,
        name: 'Level One',
        sortOrder: 1,
      })
      .expect(201);
    const catechismLevel = levelResponse.body as CatechismLevelResponseBody;

    const classAResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}class-a`,
        name: 'Class A',
      })
      .expect(201);
    const classA = classAResponse.body as ClassResponseBody;

    const classBResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}class-b`,
        name: 'Class B',
      })
      .expect(201);
    const classB = classBResponse.body as ClassResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${classA.id}/status`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${classB.id}/status`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    const curriculumResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/curricula`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        catechismLevelId: catechismLevel.id,
        code: `${TEST_CODE_PREFIX}curriculum`,
        name: 'Delivery Curriculum',
        sourceLocale: 'vi-VN',
      })
      .expect(201);
    const curriculum = curriculumResponse.body as CurriculumResponseBody;

    const versionResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curricula/${curriculum.id}/versions`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ label: 'Draft v1' })
      .expect(201);
    const version = versionResponse.body as CurriculumVersionResponseBody;

    const topicResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/topics`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ title: 'Chủ đề A', sortOrder: 0 })
      .expect(201);
    const topic = topicResponse.body as TopicResponseBody;

    const lessonResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ title: 'Bài học A', sortOrder: 0, estimatedDurationMinutes: 45 })
      .expect(201);
    const lesson = lessonResponse.body as LessonResponseBody;

    await request(getTestHttpServer(application))
      .put(`/api/v1/lessons/${lesson.id}/content`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ document: contentDocument })
      .expect(200);

    const publishResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${version.id}/publish`)
      .set('Authorization', `Bearer ${setupToken}`)
      .expect(200);
    const published = publishResponse.body as CurriculumVersionResponseBody;

    await request(getTestHttpServer(application))
      .put(
        `/api/v1/parishes/${parish.id}/academic-years/${academicYear.id}/catechism-levels/${catechismLevel.id}/curriculum-assignment`,
      )
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ curriculumVersionId: published.id })
      .expect(200);

    const studentResponse = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ fullName: `${TEST_CODE_PREFIX}Student Alpha` })
      .expect(201);
    const student = studentResponse.body as StudentResponseBody;

    const enrollResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${classA.id}/enrollments`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({ studentId: student.id })
      .expect(201);
    const enrollment = enrollResponse.body as EnrollmentResponseBody;

    return {
      parishId: parish.id,
      classAId: classA.id,
      classBId: classB.id,
      lessonId: lesson.id,
      canonicalLessonKey: lesson.canonicalLessonKey,
      publishedVersionId: published.id,
      enrollmentId: enrollment.id,
      studentId: student.id,
    };
  }

  it('returns 401 for unauthenticated curriculum delivery requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/classes/11111111-1111-4111-8111-111111111111/curriculum-tree')
      .expect(401);

    await request(getTestHttpServer(application))
      .get('/api/v1/enrollments/11111111-1111-4111-8111-111111111111/curriculum-tree')
      .expect(401);

    await request(getTestHttpServer(application))
      .get(
        '/api/v1/classes/11111111-1111-4111-8111-111111111111/lessons/22222222-2222-4222-8222-222222222222/content',
      )
      .expect(401);
  });

  it('returns 200 for assigned catechist class tree and 403 for unassigned catechist', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('catechist-scope');
    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId);
    const assignedCatechist = await createRoleUser('assigned-catechist', 'CATECHIST');
    const unassignedCatechist = await createRoleUser('unassigned-catechist', 'CATECHIST');

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${fixture.classAId}/catechists`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        catechistUserId: assignedCatechist.userId,
        assignmentRole: CatechistAssignmentRole.Lead,
      })
      .expect(201);

    const allowedResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/curriculum-tree`)
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .expect(200);

    const tree = allowedResponse.body as LearnerCurriculumTreeResponseBody;
    expect(tree.topics[0]?.lessons[0]?.canonicalLessonKey.toLowerCase()).toBe(
      fixture.canonicalLessonKey.toLowerCase(),
    );

    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/curriculum-tree`)
      .set('Authorization', `Bearer ${unassignedCatechist.accessToken}`)
      .expect(403);
  });

  it('returns 200 for linked parent enrollment tree and 403 for unrelated parent', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser('parent-scope');
    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId);
    const linkedParent = await createRoleUser('linked-parent', 'PARENT');
    const unrelatedParent = await createRoleUser('unrelated-parent', 'PARENT');

    await request(getTestHttpServer(application))
      .post(`/api/v1/students/${fixture.studentId}/guardians`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        guardianUserId: linkedParent.userId,
        relationshipType: GuardianRelationshipType.Parent,
        isPrimary: true,
      })
      .expect(201);

    const allowedResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/curriculum-tree`)
      .set('Authorization', `Bearer ${linkedParent.accessToken}`)
      .expect(200);

    const tree = allowedResponse.body as LearnerCurriculumTreeResponseBody;
    expect(tree.version.id.toLowerCase()).toBe(fixture.publishedVersionId.toLowerCase());

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/curriculum-tree`)
      .set('Authorization', `Bearer ${unrelatedParent.accessToken}`)
      .expect(403);
  });

  it('returns 200 for assigned contextual lesson content and 403 for draft lesson content', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('lesson-content');
    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId);
    const assignedCatechist = await createRoleUser('content-catechist', 'CATECHIST');

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${fixture.classAId}/catechists`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        catechistUserId: assignedCatechist.userId,
        assignmentRole: CatechistAssignmentRole.Lead,
      })
      .expect(201);

    const contentResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/lessons/${fixture.lessonId}/content`)
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .set('Accept-Language', 'vi-VN')
      .expect(200);

    const content = contentResponse.body as LearnerLessonContentResponseBody;
    expect(content.lessonId.toLowerCase()).toBe(fixture.lessonId.toLowerCase());
    expect(content.canonicalLessonKey.toLowerCase()).toBe(fixture.canonicalLessonKey.toLowerCase());
    expect(content.contentHash).toBeTruthy();
    expect(content.sourceLocale).toBe('vi-VN');

    const cloneResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/curriculum-versions/${fixture.publishedVersionId}/clone-to-draft`)
      .set('Authorization', `Bearer ${setupToken}`)
      .expect(201);
    const clonedVersion = cloneResponse.body as CurriculumVersionResponseBody;
    expect(clonedVersion.status).toBe(CurriculumVersionStatus.Draft);

    const clonedTreeResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/curriculum-versions/${clonedVersion.id}/tree`)
      .set('Authorization', `Bearer ${setupToken}`)
      .expect(200);
    const clonedTree = clonedTreeResponse.body as VersionTreeResponseBody;
    const draftLessonId = clonedTree.topics[0]?.lessons[0]?.id ?? '';

    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/lessons/${draftLessonId}/content`)
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .expect(403);
  });

  it('returns 200 for parish admin delivery routes in own parish', async () => {
    const { accessToken: setupToken, userId: setupUserId } =
      await setupManageUser('parish-admin-setup');
    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId);
    const parishAdmin = await createRoleUser('parish-admin', 'PARISH_ADMIN');
    await ensureTestParishMembership(parishAdmin.userId, fixture.parishId);

    const treeResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/curriculum-tree`)
      .set('Authorization', `Bearer ${parishAdmin.accessToken}`)
      .expect(200);

    const tree = treeResponse.body as LearnerCurriculumTreeResponseBody;
    expect(tree.topics).toHaveLength(1);

    const contentResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${fixture.classAId}/lessons/${fixture.lessonId}/content`)
      .set('Authorization', `Bearer ${parishAdmin.accessToken}`)
      .expect(200);

    const content = contentResponse.body as LearnerLessonContentResponseBody;
    expect(content.contentHash).toBeTruthy();
  });

  it('allows contextual lesson media for assigned catechist and denies generic media access', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser(
      'contextual-media-catechist-setup',
    );
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);

    const uploadResponse = await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .set('Authorization', `Bearer ${setupToken}`)
      .attach('file', jpegBuffer, 'lesson-photo.jpg')
      .field('intendedCategory', 'IMAGE')
      .expect(201);

    const assetId = (uploadResponse.body as { id: string }).id;

    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId, {
      schemaVersion: 1,
      blocks: [
        { type: 'paragraph', text: 'Lesson with image.' },
        { type: 'image_ref', assetId, alt: 'Lesson photo' },
      ],
    });

    const assignedCatechist = await createRoleUser('contextual-media-catechist', 'CATECHIST');

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${fixture.classAId}/catechists`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        catechistUserId: assignedCatechist.userId,
        assignmentRole: CatechistAssignmentRole.Lead,
      })
      .expect(201);

    const contentResponse = await request(getTestHttpServer(application))
      .get(
        `/api/v1/classes/${fixture.classAId}/lessons/${fixture.lessonId}/media/${assetId}/content`,
      )
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200);

    expect(contentResponse.body).toEqual(jpegBuffer);

    await request(getTestHttpServer(application))
      .get(`/api/v1/media/assets/${assetId}/content`)
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(
        `/api/v1/classes/${fixture.classAId}/lessons/${fixture.lessonId}/media/11111111-1111-4111-8111-111111111111/content`,
      )
      .set('Authorization', `Bearer ${assignedCatechist.accessToken}`)
      .expect(403);
  });

  it('allows contextual lesson media for linked parent enrollment context', async () => {
    const { accessToken: setupToken, userId: setupUserId } = await setupManageUser(
      'contextual-media-parent-setup',
    );
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);

    const uploadResponse = await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .set('Authorization', `Bearer ${setupToken}`)
      .attach('file', jpegBuffer, 'parent-lesson-photo.jpg')
      .field('intendedCategory', 'IMAGE')
      .expect(201);

    const assetId = (uploadResponse.body as { id: string }).id;

    const fixture = await seedPublishedDeliveryFixture(setupToken, setupUserId, {
      schemaVersion: 1,
      blocks: [{ type: 'image_ref', assetId, alt: 'Parent lesson photo' }],
    });

    const linkedParent = await createRoleUser('contextual-media-parent', 'PARENT');

    await request(getTestHttpServer(application))
      .post(`/api/v1/students/${fixture.studentId}/guardians`)
      .set('Authorization', `Bearer ${setupToken}`)
      .send({
        guardianUserId: linkedParent.userId,
        relationshipType: GuardianRelationshipType.Parent,
        isPrimary: true,
      })
      .expect(201);

    const lessonContentResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/lessons/${fixture.lessonId}/content`)
      .set('Authorization', `Bearer ${linkedParent.accessToken}`)
      .expect(200);

    const lessonContent = lessonContentResponse.body as {
      document: { blocks: Array<{ mediaContentPath?: string }> };
    };
    expect(lessonContent.document.blocks[0]?.mediaContentPath?.toLowerCase()).toBe(
      `/api/v1/enrollments/${fixture.enrollmentId}/lessons/${fixture.lessonId}/media/${assetId}/content`.toLowerCase(),
    );

    const mediaResponse = await request(getTestHttpServer(application))
      .get(
        `/api/v1/enrollments/${fixture.enrollmentId}/lessons/${fixture.lessonId}/media/${assetId}/content`,
      )
      .set('Authorization', `Bearer ${linkedParent.accessToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200);

    expect(mediaResponse.body).toEqual(jpegBuffer);
  });
});
