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

const CROSS_PARISH_PREFIX = 'co003-';
const UNASSIGNED_CATECHIST_EMAIL = `${CROSS_PARISH_PREFIX}unassigned-catechist@example.com`;
const SUPERADMIN_EMAIL = `superadmin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

const SENSITIVE_FIELD_KEYS = [
  'email',
  'phone',
  'phoneNumber',
  'dateOfBirth',
  'dob',
  'birthDate',
] as const;

interface LoginResponseBody {
  accessToken: string;
}

interface ClassSessionResponseBody {
  id: string;
  classId: string;
  parishId: string;
  academicYearId: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  status: ClassSessionStatus;
  cancelledAt: string | null;
  completedAt: string | null;
  rosterCount: number;
  markedCount: number;
  unmarkedCount: number;
}

interface ClassSessionListResponseBody {
  items: ClassSessionResponseBody[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AttendanceRosterItemBody {
  enrollmentId: string;
  studentId: string;
  displayName: string;
  status: AttendanceStatus | null;
  note: string | null;
  markedAt: string | null;
}

interface SessionAttendanceResponseBody {
  session: ClassSessionResponseBody;
  rosterCount: number;
  markedCount: number;
  unmarkedCount: number;
  items: AttendanceRosterItemBody[];
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

interface CreateSessionBody {
  title: string;
  startsAt: string;
  endsAt: string;
}

function assertNoSensitiveFields(payload: unknown): void {
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
      expect(SENSITIVE_FIELD_KEYS.includes(key as (typeof SENSITIVE_FIELD_KEYS)[number])).toBe(
        false,
      );
      stack.push(record[key]);
    }
  }
}

function assertSortedByDisplayName(items: readonly AttendanceRosterItemBody[]): void {
  const names = items.map((item) => item.displayName);
  const sorted = [...names].sort((left, right) => left.localeCompare(right));

  expect(names).toEqual(sorted);
}

function buildCreateSessionBody(title: string, offsetMinutes = 60): CreateSessionBody {
  const startsAt = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  return {
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

describe('Class Operations staff routes (db e2e)', () => {
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

  async function createSessionAs(
    token: string,
    classId: string,
    body: CreateSessionBody,
  ): Promise<ClassSessionResponseBody> {
    const response = await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${classId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    return response.body as ClassSessionResponseBody;
  }

  async function createCrossParishActiveClass(): Promise<string> {
    const parishResponse = await request(getTestHttpServer(application))
      .post('/api/v1/parishes')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: `${CROSS_PARISH_PREFIX}parish`,
        name: 'CO003 Cross Parish',
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
        name: 'CO003 Level',
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
        name: 'CO003 Cross Class',
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

  it('rejects unauthenticated session create with 401', async () => {
    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .send(buildCreateSessionBody('Unauthenticated session'))
      .expect(401);
  });

  it('supports assigned catechist session lifecycle and attendance rules', async () => {
    const created = await createSessionAs(
      catechistToken,
      demoClassAId,
      buildCreateSessionBody('Catechist lifecycle session', 90),
    );

    expect(normalizeUuid(created.classId)).toBe(normalizeUuid(demoClassAId));
    expect(created.status).toBe(ClassSessionStatus.Scheduled);
    expect(created.rosterCount).toBeGreaterThanOrEqual(1);
    assertNoSensitiveFields(created);
    expect(Object.prototype.hasOwnProperty.call(created, 'note')).toBe(false);

    const attendanceBefore = await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const attendanceBeforeBody = attendanceBefore.body as SessionAttendanceResponseBody;

    expect(attendanceBeforeBody.rosterCount).toBe(created.rosterCount);
    expect(attendanceBeforeBody.items.length).toBe(created.rosterCount);
    expect(attendanceBeforeBody.markedCount).toBe(0);
    expect(attendanceBeforeBody.unmarkedCount).toBe(created.rosterCount);
    assertSortedByDisplayName(attendanceBeforeBody.items);
    assertNoSensitiveFields(attendanceBeforeBody);

    for (const item of attendanceBeforeBody.items) {
      expect(item.status).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(item, 'note')).toBe(true);
      expect(item.note).toBeNull();
    }

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const listBody = listResponse.body as ClassSessionListResponseBody;

    expect(listBody.items.some((item) => item.id === created.id)).toBe(true);
    assertNoSensitiveFields(listBody);

    const detailResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const detailBody = detailResponse.body as ClassSessionResponseBody;

    expect(detailBody.id).toBe(created.id);
    expect(detailBody.status).toBe(ClassSessionStatus.Scheduled);
    assertNoSensitiveFields(detailBody);

    const patchedTitle = 'Catechist lifecycle session (patched)';
    const patchResponse = await request(getTestHttpServer(application))
      .patch(`/api/v1/class-sessions/${created.id}`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({ title: patchedTitle })
      .expect(200);
    const patchedBody = patchResponse.body as ClassSessionResponseBody;

    expect(patchedBody.title).toBe(patchedTitle);
    expect(patchedBody.status).toBe(ClassSessionStatus.Scheduled);

    await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);

    const refreshBeforeMarks = await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${created.id}/roster/refresh`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const refreshedBody = refreshBeforeMarks.body as ClassSessionResponseBody;

    expect(refreshedBody.id).toBe(created.id);
    expect(refreshedBody.status).toBe(ClassSessionStatus.Scheduled);

    const firstLearner = attendanceBeforeBody.items[0];

    if (firstLearner === undefined) {
      throw new Error('Expected at least one roster learner.');
    }

    const partialPutBody = {
      records: [
        {
          enrollmentId: firstLearner.enrollmentId,
          status: AttendanceStatus.Present,
          note: 'Arrived on time',
        },
      ],
    };

    const partialPutResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(partialPutBody)
      .expect(200);
    const partialPutResult = partialPutResponse.body as SessionAttendanceResponseBody;

    expect(partialPutResult.markedCount).toBe(1);
    expect(partialPutResult.unmarkedCount).toBe(Math.max(partialPutResult.rosterCount - 1, 0));

    const markedItem = partialPutResult.items.find(
      (item) => item.enrollmentId === firstLearner.enrollmentId,
    );
    const omittedItems = partialPutResult.items.filter(
      (item) => item.enrollmentId !== firstLearner.enrollmentId,
    );

    expect(markedItem?.status).toBe(AttendanceStatus.Present);
    expect(markedItem?.note).toBe('Arrived on time');

    for (const omitted of omittedItems) {
      expect(omitted.status).toBeNull();
      expect(omitted.note).toBeNull();
    }

    assertSortedByDisplayName(partialPutResult.items);

    const identicalPutResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(partialPutBody)
      .expect(200);
    const identicalPutResult = identicalPutResponse.body as SessionAttendanceResponseBody;

    expect(identicalPutResult.markedCount).toBe(1);
    expect(
      identicalPutResult.items.find((item) => item.enrollmentId === firstLearner.enrollmentId)
        ?.status,
    ).toBe(AttendanceStatus.Present);

    const secondLearner = attendanceBeforeBody.items[1];
    const mixedRecords =
      secondLearner === undefined
        ? [
            {
              enrollmentId: firstLearner.enrollmentId,
              status: AttendanceStatus.Late,
              note: 'Late arrival',
            },
          ]
        : [
            {
              enrollmentId: firstLearner.enrollmentId,
              status: AttendanceStatus.Present,
              note: 'Present note',
            },
            {
              enrollmentId: secondLearner.enrollmentId,
              status: AttendanceStatus.Absent,
              note: 'Absent note',
            },
          ];

    const mixedPutResponse = await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({ records: mixedRecords })
      .expect(200);
    const mixedPutResult = mixedPutResponse.body as SessionAttendanceResponseBody;

    expect(mixedPutResult.markedCount).toBe(mixedRecords.length);
    assertSortedByDisplayName(mixedPutResult.items);

    await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({
        records: [
          {
            enrollmentId: firstLearner.enrollmentId,
            status: AttendanceStatus.Present,
          },
          {
            enrollmentId: firstLearner.enrollmentId,
            status: AttendanceStatus.Absent,
          },
        ],
      })
      .expect(400);

    await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({
        records: [
          {
            enrollmentId: generateUuidV4(),
            status: AttendanceStatus.Present,
          },
        ],
      })
      .expect(422);

    await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${created.id}/roster/refresh`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(409);

    const completeResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${created.id}/complete`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const completedBody = completeResponse.body as ClassSessionResponseBody;

    expect(completedBody.status).toBe(ClassSessionStatus.Completed);
    expect(completedBody.completedAt).not.toBeNull();

    await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send(partialPutBody)
      .expect(409);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/class-sessions/${created.id}`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({ title: 'Should not update after complete' })
      .expect(409);
  });

  it('rejects attendance PUT after cancel', async () => {
    const created = await createSessionAs(
      catechistToken,
      demoClassAId,
      buildCreateSessionBody('Cancel path session', 120),
    );

    const cancelResponse = await request(getTestHttpServer(application))
      .post(`/api/v1/class-sessions/${created.id}/cancel`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const cancelledBody = cancelResponse.body as ClassSessionResponseBody;

    expect(cancelledBody.status).toBe(ClassSessionStatus.Cancelled);
    expect(cancelledBody.cancelledAt).not.toBeNull();

    const attendanceResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .expect(200);
    const attendanceBody = attendanceResponse.body as SessionAttendanceResponseBody;
    const firstLearner = attendanceBody.items[0];

    if (firstLearner === undefined) {
      throw new Error('Expected roster learner for cancel path.');
    }

    await request(getTestHttpServer(application))
      .put(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${catechistToken}`)
      .send({
        records: [
          {
            enrollmentId: firstLearner.enrollmentId,
            status: AttendanceStatus.Present,
          },
        ],
      })
      .expect(409);
  });

  it('rejects unassigned catechist session create with 403', async () => {
    const account = await userAccountService.createAccount({
      email: UNASSIGNED_CATECHIST_EMAIL,
      password: AUTH_RBAC_SAMPLE_PASSWORD,
    });
    await accessControlService.assignRoleToUser(account.id, CATECHIST_ROLE_CODE);

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email: UNASSIGNED_CATECHIST_EMAIL, password: AUTH_RBAC_SAMPLE_PASSWORD })
      .expect(200);
    const unassignedToken = (loginResponse.body as LoginResponseBody).accessToken;

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${unassignedToken}`)
      .send(buildCreateSessionBody('Unassigned catechist session', 150))
      .expect(403);
  });

  it('allows parish admin in own parish and denies cross-parish class manage', async () => {
    const ownParishCreate = await createSessionAs(
      parishAdminToken,
      demoClassAId,
      buildCreateSessionBody('Parish admin own parish session', 180),
    );

    expect(normalizeUuid(ownParishCreate.classId)).toBe(normalizeUuid(demoClassAId));
    expect(ownParishCreate.status).toBe(ClassSessionStatus.Scheduled);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(200);
    const listBody = listResponse.body as ClassSessionListResponseBody;

    expect(listBody.items.some((item) => item.id === ownParishCreate.id)).toBe(true);

    const crossParishClassId = await createCrossParishActiveClass();

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${crossParishClassId}/sessions`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .send(buildCreateSessionBody('Cross parish denied session', 210))
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${crossParishClassId}/sessions`)
      .set('Authorization', `Bearer ${parishAdminToken}`)
      .expect(403);
  });

  it('allows superadmin to create and list sessions', async () => {
    const created = await createSessionAs(
      superAdminToken,
      demoClassAId,
      buildCreateSessionBody('Superadmin session', 240),
    );

    expect(normalizeUuid(created.classId)).toBe(normalizeUuid(demoClassAId));
    expect(created.status).toBe(ClassSessionStatus.Scheduled);

    const listResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    const listBody = listResponse.body as ClassSessionListResponseBody;

    expect(listBody.items.some((item) => item.id === created.id)).toBe(true);
  });

  it('denies parent and student staff session manage and attendance read', async () => {
    const created = await createSessionAs(
      catechistToken,
      demoClassAId,
      buildCreateSessionBody('Denial matrix session', 270),
    );

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send(buildCreateSessionBody('Parent manage denied', 280))
      .expect(403);

    await request(getTestHttpServer(application))
      .post(`/api/v1/classes/${demoClassAId}/sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send(buildCreateSessionBody('Student manage denied', 290))
      .expect(403);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/class-sessions/${created.id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Parent patch denied' })
      .expect(403);

    await request(getTestHttpServer(application))
      .patch(`/api/v1/class-sessions/${created.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student patch denied' })
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get(`/api/v1/class-sessions/${created.id}/attendance`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});
