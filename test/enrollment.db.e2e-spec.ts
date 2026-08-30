import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../src/modules/access-control/errors/access-control.errors';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { CatechistAssignmentRole } from '../src/modules/class/enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../src/modules/class/enums/catechist-assignment-status.enum';
import { ClassStatus } from '../src/modules/class/enums/class-status.enum';
import { EnrollmentStatus } from '../src/modules/enrollment/enums/enrollment-status.enum';
import { StudentStatus } from '../src/modules/student/enums/student-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'cls005-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'CLS005_TESTER';
const TEST_CODE_PREFIX = 'cls005-e2e-';

interface LoginResponseBody {
  accessToken: string;
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

interface StudentResponseBody {
  id: string;
  status: StudentStatus;
}

interface EnrollmentResponseBody {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
}

interface CatechistAssignmentResponseBody {
  id: string;
  classId: string;
  catechistUserId: string;
  status: CatechistAssignmentStatus;
}

describe('Enrollment and catechist assignment API (db e2e)', () => {
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
      DELETE FROM catechism_levels
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
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
      DELETE FROM roles WHERE code = '${TEST_ROLE_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
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

  async function ensureRole(): Promise<void> {
    try {
      await accessControlService.createRole({
        code: TEST_ROLE_CODE,
        name: 'Enrollment API Tester',
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
    await ensurePermission('academic-years.read', 'Read academic years');
    await ensurePermission('academic-years.manage', 'Manage academic years');
    await ensurePermission('catechism-levels.read', 'Read catechism levels');
    await ensurePermission('catechism-levels.manage', 'Manage catechism levels');
    await ensurePermission('classes.read', 'Read classes');
    await ensurePermission('classes.manage', 'Manage classes');
    await ensurePermission('students.read', 'Read students');
    await ensurePermission('students.manage', 'Manage students');
    await ensurePermission('class-catechists.read', 'Read class catechists');
    await ensurePermission('class-catechists.manage', 'Manage class catechists');
    await ensurePermission('enrollments.read', 'Read enrollments');
    await ensurePermission('enrollments.manage', 'Manage enrollments');
    await ensureRole();
  }

  async function setupManageUser(localPart: string): Promise<string> {
    const email = buildTestEmail(localPart);
    const account = await userAccountService.createAccount({ email, password: TEST_PASSWORD });
    await seedPermissions();
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'parishes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'academic-years.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'catechism-levels.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'classes.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'students.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'class-catechists.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'class-catechists.read');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'enrollments.manage');
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, 'enrollments.read');
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);

    return login(email);
  }

  async function seedActiveClassPair(accessToken: string): Promise<{
    parishId: string;
    classAId: string;
    classBId: string;
  }> {
    const parishResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}parish`,
        name: 'Enrollment Parish',
      })
      .expect(201);
    const parish = parishResponse.body as ParishResponseBody;

    const yearResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${TEST_CODE_PREFIX}year`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);
    const academicYear = yearResponse.body as AcademicYearResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/academic-years/${academicYear.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: AcademicYearStatus.Active })
      .expect(200);

    const levelResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: `${TEST_CODE_PREFIX}level`,
        name: 'Level One',
        sortOrder: 1,
      })
      .expect(201);
    const catechismLevel = levelResponse.body as CatechismLevelResponseBody;

    const classAResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${classB.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    return { parishId: parish.id, classAId: classA.id, classBId: classB.id };
  }

  it('returns 401 for unauthenticated enrollment requests', async () => {
    await request(getTestHttpServer(application))
      .get('/api/v1/enrollments/11111111-1111-4111-8111-111111111111')
      .expect(401);
  });

  it('enrolls and transfers a student over HTTP', async () => {
    const accessToken = await setupManageUser('enroll-transfer');
    const { classAId, classBId } = await seedActiveClassPair(accessToken);

    const studentResponse = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: `${TEST_CODE_PREFIX}Transfer Student` })
      .expect(201);
    const student = studentResponse.body as StudentResponseBody;

    const enrollResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${classAId}/enrollments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ studentId: student.id })
      .expect(201);
    const enrollment = enrollResponse.body as EnrollmentResponseBody;

    expect(enrollment.status).toBe(EnrollmentStatus.Active);
    expect(enrollment.classId).toBe(classAId);

    const transferResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/enrollments/${enrollment.id}/transfer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetClassId: classBId })
      .expect(201);
    const transferred = transferResponse.body as EnrollmentResponseBody;

    expect(transferred.status).toBe(EnrollmentStatus.Active);
    expect(transferred.classId).toBe(classBId);

    const sourceResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${enrollment.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((sourceResponse.body as EnrollmentResponseBody).status).toBe(EnrollmentStatus.Transferred);
  });

  it('assigns and ends a catechist over HTTP', async () => {
    const accessToken = await setupManageUser('catechist');
    const { classAId } = await seedActiveClassPair(accessToken);
    const catechistAccount = await userAccountService.createAccount({
      email: buildTestEmail('catechist-user'),
      password: TEST_PASSWORD,
    });

    const assignResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${classAId}/catechists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        catechistUserId: catechistAccount.id,
        assignmentRole: CatechistAssignmentRole.Lead,
      })
      .expect(201);
    const assignment = assignResponse.body as CatechistAssignmentResponseBody;

    expect(assignment.status).toBe(CatechistAssignmentStatus.Active);

    const endResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/class-catechist-assignments/${assignment.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: CatechistAssignmentStatus.Ended })
      .expect(200);

    expect((endResponse.body as CatechistAssignmentResponseBody).status).toBe(
      CatechistAssignmentStatus.Ended,
    );

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${classAId}/catechists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((listResponse.body as { total: number }).total).toBe(0);
  });
});
