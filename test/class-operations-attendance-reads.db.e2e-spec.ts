import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../src/database/uuid-v4.util';
import {
  AUTH_RBAC_SAMPLE_DOMAIN,
  AUTH_RBAC_SAMPLE_PASSWORD,
} from '../src/database/seeds/auth-rbac.seed.constants';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../src/database/seeds/class-enrollment.seed.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from '../src/database/seeds/class-enrollment.seed.constants';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../src/database/seeds/parish-academic.seed.constants';
import { CATECHIST_ROLE_CODE } from '../src/modules/access-control/constants/role-codes.constants';
import { AccessControlService } from '../src/modules/access-control/services/access-control.service';
import { AcademicYearStatus } from '../src/modules/academic-structure/enums/academic-year-status.enum';
import { ClassStatus } from '../src/modules/class/enums/class-status.enum';
import { ClassService } from '../src/modules/class/services/class.service';
import { AttendanceStatus } from '../src/modules/class-operations/enums/attendance-status.enum';
import { ClassSessionStatus } from '../src/modules/class-operations/enums/class-session-status.enum';
import { ParishService } from '../src/modules/parish/services/parish.service';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';
import {
  deleteClassOperationsRowsForParishCode,
  deleteClassOperationsRowsForParishCodePrefix,
} from './integration/helpers/delete-class-operations-rows-for-parish-code.util';

const CROSS_PARISH_PREFIX = 'co004-';
const UNASSIGNED_CATECHIST_EMAIL = `${CROSS_PARISH_PREFIX}unassigned-catechist@example.com`;
const SUPERADMIN_EMAIL = `superadmin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

const AUDIT_FIELD_KEYS = [
  'markedByUserId',
  'updatedByUserId',
  'createdByUserId',
  'email',
  'phone',
  'phoneNumber',
  'dateOfBirth',
] as const;

interface LoginResponseBody {
  accessToken: string;
}

interface ClassSessionResponseBody {
  id: string;
  classId: string;
  status: ClassSessionStatus;
  rosterCount: number;
}

interface AttendanceRosterItemBody {
  enrollmentId: string;
  studentId: string;
  displayName: string;
  status: AttendanceStatus | null;
  note: string | null;
}

interface SessionAttendanceResponseBody {
  items: AttendanceRosterItemBody[];
}

interface HistoryItemBody {
  sessionId: string;
  classId: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  sessionStatus: string;
  attendanceStatus: AttendanceStatus | null;
  note?: string | null;
  markedAt: string | null;
}

interface HistoryResponseBody {
  enrollmentId: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: HistoryItemBody[];
}

interface SummaryResponseBody {
  enrollmentId: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  unmarkedCount: number;
  attendanceRatePercent: number;
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
  fullName: string;
}

interface EnrollmentResponseBody {
  id: string;
  studentId: string;
}

function assertNoAuditOrPii(payload: unknown): void {
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === null || current === undefined) {
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item);
      }
      continue;
    }

    if (typeof current !== 'object') {
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      expect(AUDIT_FIELD_KEYS.includes(key as (typeof AUDIT_FIELD_KEYS)[number])).toBe(false);
      stack.push(record[key]);
    }
  }
}

function buildCreateSessionBody(
  title: string,
  offsetMinutes = 60,
): {
  title: string;
  startsAt: string;
  endsAt: string;
} {
  const startsAt = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  return {
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

describe('Class Operations enrollment attendance reads (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;
  let demoClassAId: string;
  let catechistToken: string;
  let parishAdminToken: string;
  let parentToken: string;
  let studentToken: string;
  let superAdminToken: string;
  let userAccountService: UserAccountService;
  let accessControlService: AccessControlService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    seedModuleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule, ParishAcademicSeedModule, ClassEnrollmentSeedModule],
    }).compile();

    await seedModuleRef.get(AuthRbacSeedService).run();
    await seedModuleRef.get(ParishAcademicSeedService).run();
    await seedModuleRef.get(ClassEnrollmentSeedService).run();

    const parishService = seedModuleRef.get(ParishService);
    const classService = seedModuleRef.get(ClassService);
    const parishList = await parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );

    if (parish === undefined) {
      throw new Error('Expected demo parish from seed.');
    }

    const classList = await classService.listClassesByParish(parish.id, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
    });
    const classA = classList.items.find((item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE);

    if (classA === undefined) {
      throw new Error('Expected demo class A from seed.');
    }

    demoClassAId = classA.id;

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });
    userAccountService = application.get(UserAccountService);
    accessControlService = application.get(AccessControlService);

    async function login(email: string): Promise<string> {
      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
        .expect(200);

      return (response.body as LoginResponseBody).accessToken;
    }

    catechistToken = await login(CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL);
    parishAdminToken = await login(CLASS_ENROLLMENT_SEED_ADMIN_EMAIL);
    parentToken = await login(CLASS_ENROLLMENT_SEED_PARENT_EMAIL);
    studentToken = await login(CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL);
    superAdminToken = await login(SUPERADMIN_EMAIL);
  });

  afterEach(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await deleteClassOperationsRowsForParishCode(AppDataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
    await deleteClassOperationsRowsForParishCodePrefix(AppDataSource, CROSS_PARISH_PREFIX);

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${CROSS_PARISH_PREFIX}%')
         OR student_id IN (SELECT id FROM students WHERE full_name LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE '${CROSS_PARISH_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${CROSS_PARISH_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${CROSS_PARISH_PREFIX}%')
         OR user_id IN (SELECT id FROM users WHERE email LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${CROSS_PARISH_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${CROSS_PARISH_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${CROSS_PARISH_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function createCompletedAttendanceFixture(): Promise<{
    enrollmentId: string;
    sessionId: string;
  }> {
    const created = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(buildCreateSessionBody('CO004 completed', 120))
      .expect(201);
    const session = created.body as ClassSessionResponseBody;

    const attendanceResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${session.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const attendance = attendanceResponse.body as SessionAttendanceResponseBody;
    const alpha = attendance.items.find(
      (item) => item.displayName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    );

    if (alpha === undefined) {
      throw new Error('Expected demo student alpha on roster');
    }

    await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${session.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({
        records: [
          {
            enrollmentId: alpha.enrollmentId,
            status: AttendanceStatus.Present,
            note: 'staff-private-note',
          },
        ],
      })
      .expect(200);

    await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${session.id}/complete`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    return { enrollmentId: alpha.enrollmentId, sessionId: session.id };
  }

  async function createCrossParishActiveClass(): Promise<string> {
    const parishResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: `${CROSS_PARISH_PREFIX}parish`,
        name: 'CO004 Cross Parish',
      })
      .expect(201);
    const parish = parishResponse.body as ParishResponseBody;

    const yearResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/academic-years`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `${CROSS_PARISH_PREFIX}year`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      })
      .expect(201);
    const academicYear = yearResponse.body as AcademicYearResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/academic-years/${academicYear.id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: AcademicYearStatus.Active })
      .expect(200);

    const levelResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/catechism-levels`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: `${CROSS_PARISH_PREFIX}level`,
        name: 'CO004 Level',
        sortOrder: 1,
      })
      .expect(201);
    const level = levelResponse.body as CatechismLevelResponseBody;

    const classResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/parishes/${parish.id}/classes`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        academicYearId: academicYear.id,
        catechismLevelId: level.id,
        code: `${CROSS_PARISH_PREFIX}class`,
        name: 'CO004 Cross Class',
      })
      .expect(201);
    const createdClass = classResponse.body as ClassResponseBody;

    await request(getTestHttpServer(application))
      .patch(`/api/v1/classes/${createdClass.id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: ClassStatus.Active })
      .expect(200);

    return createdClass.id;
  }

  it('covers generic staff matrix, parent/learner me scope, privacy, and eligibility', async () => {
    const fixture = await createCompletedAttendanceFixture();

    // GENERIC staff
    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance-summary`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const unassigned = await userAccountService.createAccount({
      email: UNASSIGNED_CATECHIST_EMAIL,
      password: AUTH_RBAC_SAMPLE_PASSWORD,
    });
    await accessControlService.assignRoleToUser(unassigned.id, CATECHIST_ROLE_CODE);
    const unassignedLogin = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email: UNASSIGNED_CATECHIST_EMAIL, password: AUTH_RBAC_SAMPLE_PASSWORD })
      .expect(200);
    const unassignedToken = (unassignedLogin.body as LoginResponseBody).accessToken;

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${unassignedToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(200);

    const foreignClassId = await createCrossParishActiveClass();
    const foreignStudent = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ fullName: `${CROSS_PARISH_PREFIX}Foreign Student` })
      .expect(201);
    const foreignStudentBody = foreignStudent.body as StudentResponseBody;
    const foreignEnrollment = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${foreignClassId}/enrollments`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ studentId: foreignStudentBody.id })
      .expect(201);
    const foreignEnrollmentBody = foreignEnrollment.body as EnrollmentResponseBody;

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${foreignEnrollmentBody.id}/attendance`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    // PARENT me
    const parentHistory = await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const parentHistoryBody = parentHistory.body as HistoryResponseBody;

    expect(normalizeUuid(parentHistoryBody.enrollmentId)).toBe(normalizeUuid(fixture.enrollmentId));
    expect(parentHistoryBody.total).toBe(1);
    expect(parentHistoryBody.items[0]?.attendanceStatus).toBe(AttendanceStatus.Present);
    expect(Object.prototype.hasOwnProperty.call(parentHistoryBody.items[0], 'note')).toBe(false);
    assertNoAuditOrPii(parentHistoryBody);

    const parentSummary = await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance-summary`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const parentSummaryBody = parentSummary.body as SummaryResponseBody;
    expect(parentSummaryBody.totalSessions).toBe(1);
    expect(parentSummaryBody.presentCount).toBe(1);
    expect(parentSummaryBody.attendanceRatePercent).toBe(100);
    assertNoAuditOrPii(parentSummaryBody);

    const orphanStudent = await request(getTestHttpServer(application))
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .send({ fullName: `${CROSS_PARISH_PREFIX}Orphan Student` })
      .expect(201);
    const orphanStudentBody = orphanStudent.body as StudentResponseBody;
    const orphanEnrollment = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/enrollments`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .send({ studentId: orphanStudentBody.id })
      .expect(201);
    const orphanEnrollmentBody = orphanEnrollment.body as EnrollmentResponseBody;

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${orphanEnrollmentBody.id}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${generateUuidV4()}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/parent/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(403);

    // STUDENT me
    const studentHistory = await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const studentHistoryBody = studentHistory.body as HistoryResponseBody;
    expect(Object.prototype.hasOwnProperty.call(studentHistoryBody.items[0], 'note')).toBe(false);
    assertNoAuditOrPii(studentHistoryBody);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance-summary`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${orphanEnrollmentBody.id}/attendance`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/me/learner/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(403);

    // Staff history may include note; no audit IDs
    const staffHistory = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const staffHistoryBody = staffHistory.body as HistoryResponseBody;
    expect(staffHistoryBody.items[0]?.note).toBe('staff-private-note');
    assertNoAuditOrPii(staffHistoryBody);

    // CANCELLED / SCHEDULED exclusion
    const scheduled = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(buildCreateSessionBody('CO004 scheduled', 180))
      .expect(201);
    const scheduledBody = scheduled.body as ClassSessionResponseBody;

    const toCancel = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(buildCreateSessionBody('CO004 cancel', 240))
      .expect(201);
    const toCancelBody = toCancel.body as ClassSessionResponseBody;
    await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${toCancelBody.id}/cancel`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const historyAfter = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const historyAfterBody = historyAfter.body as HistoryResponseBody;
    expect(historyAfterBody.total).toBe(1);
    expect(historyAfterBody.items.some((item) => item.sessionId === scheduledBody.id)).toBe(false);
    expect(historyAfterBody.items.some((item) => item.sessionId === toCancelBody.id)).toBe(false);

    // Deterministic pagination
    const unmarkedCompleted = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(buildCreateSessionBody('CO004 unmarked completed', 300))
      .expect(201);
    const unmarkedBody = unmarkedCompleted.body as ClassSessionResponseBody;
    await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${unmarkedBody.id}/complete`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const page1 = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .query({ page: 1, limit: 1 })
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const page1Body = page1.body as HistoryResponseBody;
    expect(page1Body.items).toHaveLength(1);
    expect(page1Body.total).toBe(2);
    expect(page1Body.items[0]?.attendanceStatus).toBeNull();

    const page2 = await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .query({ page: 2, limit: 1 })
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const page2Body = page2.body as HistoryResponseBody;
    expect(page2Body.items).toHaveLength(1);
    expect(page2Body.items[0]?.sessionId).not.toBe(page1Body.items[0]?.sessionId);
    expect(page2Body.items[0]?.attendanceStatus).toBe(AttendanceStatus.Present);

    await request(getTestHttpServer(application))
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/attendance`)
      .expect(401);
  });
});
