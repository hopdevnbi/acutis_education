import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AUTH_RBAC_SEED_USERS } from '../../src/database/seeds/auth-rbac.seed.constants';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_CLASS_A_CODE } from '../../src/database/seeds/class-enrollment.seed.constants';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import { normalizeUuid } from '../../src/database/uuid-v4.util';
import { ClassOperationsModule } from '../../src/modules/class-operations/class-operations.module';
import { AttendanceStatus } from '../../src/modules/class-operations/enums/attendance-status.enum';
import { ClassSessionStatus } from '../../src/modules/class-operations/enums/class-session-status.enum';
import { ClassOperationsService } from '../../src/modules/class-operations/services/class-operations.service';
import { ClassService } from '../../src/modules/class/services/class.service';
import { EnrollmentStatus } from '../../src/modules/enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { deleteClassOperationsRowsForParishCode } from './helpers/delete-class-operations-rows-for-parish-code.util';

describe('Class operations enrollment attendance reads integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let classOperationsService: ClassOperationsService;
  let enrollmentService: EnrollmentService;
  let classId: string;
  let actorUserId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        ClassOperationsModule,
      ],
    }).compile();

    await moduleRef.get(AuthRbacSeedService).run();
    await moduleRef.get(ParishAcademicSeedService).run();
    await moduleRef.get(ClassEnrollmentSeedService).run();

    classOperationsService = moduleRef.get(ClassOperationsService);
    enrollmentService = moduleRef.get(EnrollmentService);
    const classService = moduleRef.get(ClassService);

    const parishRows = await AppDataSource.query<Array<{ id: string }>>(
      `SELECT id FROM parishes WHERE code = @0`,
      [PARISH_ACADEMIC_SAMPLE_PARISH_CODE],
    );
    const parishId = parishRows[0]?.id;
    if (parishId === undefined) {
      throw new Error('Demo parish missing');
    }

    const classes = await classService.listClassesByParish(parishId, {
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sort: 'ASC',
    });
    const demoClass = classes.items.find(
      (item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
    );
    if (demoClass === undefined) {
      throw new Error('Demo class A missing');
    }
    classId = demoClass.id;

    const catechistEmail =
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'CATECHIST')?.email ?? '';
    const userRows = await AppDataSource.query<Array<{ id: string }>>(
      `SELECT id FROM users WHERE email = @0`,
      [catechistEmail],
    );
    actorUserId = userRows[0]?.id ?? '';
  });

  afterEach(async () => {
    await deleteClassOperationsRowsForParishCode(AppDataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function createCompletedSession(input: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    marks?: ReadonlyArray<{ enrollmentId: string; status: AttendanceStatus; note?: string }>;
  }): Promise<{ sessionId: string; enrollmentId: string }> {
    const created = await classOperationsService.createScheduledSessionForClass({
      classId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: actorUserId,
    });

    const view = await classOperationsService.getSessionAttendanceView(created.id);
    const first = view.items[0];
    if (first === undefined) {
      throw new Error('Expected roster item');
    }

    if (input.marks !== undefined && input.marks.length > 0) {
      await classOperationsService.bulkUpsertAttendanceFromClient(
        created.id,
        input.marks,
        actorUserId,
      );
    }

    await classOperationsService.completeSession(created.id, actorUserId);

    return { sessionId: created.id, enrollmentId: first.enrollmentId };
  }

  it('includes COMPLETED, excludes CANCELLED and SCHEDULED, and counts unmarked', async () => {
    const completed = await createCompletedSession({
      title: 'Completed eligible',
      startsAt: new Date(Date.UTC(2026, 8, 1, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 1, 2, 0, 0)),
      marks: undefined,
    });

    const scheduled = await classOperationsService.createScheduledSessionForClass({
      classId,
      title: 'Still scheduled',
      startsAt: new Date(Date.UTC(2026, 8, 2, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 2, 2, 0, 0)),
      createdByUserId: actorUserId,
    });
    expect(scheduled.status).toBe(ClassSessionStatus.Scheduled);

    const toCancel = await classOperationsService.createScheduledSessionForClass({
      classId,
      title: 'Cancelled',
      startsAt: new Date(Date.UTC(2026, 8, 3, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 3, 2, 0, 0)),
      createdByUserId: actorUserId,
    });
    await classOperationsService.cancelSession(toCancel.id, actorUserId);

    const history = await classOperationsService.listEnrollmentAttendanceHistory({
      enrollmentId: completed.enrollmentId,
      page: 1,
      limit: 20,
    });

    expect(history.total).toBe(1);
    expect(history.items).toHaveLength(1);
    expect(normalizeUuid(history.items[0]?.sessionId ?? '')).toBe(
      normalizeUuid(completed.sessionId),
    );
    expect(history.items[0]?.attendanceStatus).toBeNull();
    expect(history.items[0]?.sessionStatus).toBe(ClassSessionStatus.Completed);

    const summary = await classOperationsService.getEnrollmentAttendanceSummary(
      completed.enrollmentId,
    );
    expect(summary.totalSessions).toBe(1);
    expect(summary.unmarkedCount).toBe(1);
    expect(summary.presentCount).toBe(0);
    expect(summary.attendanceRatePercent).toBe(0);
  });

  it('computes exact summary counts and percentage', async () => {
    const first = await createCompletedSession({
      title: 'S1',
      startsAt: new Date(Date.UTC(2026, 8, 10, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 10, 2, 0, 0)),
    });

    await createCompletedSession({
      title: 'S2',
      startsAt: new Date(Date.UTC(2026, 8, 11, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 11, 2, 0, 0)),
      marks: [
        {
          enrollmentId: first.enrollmentId,
          status: AttendanceStatus.Present,
          note: 'staff-only',
        },
      ],
    });
    await createCompletedSession({
      title: 'S3',
      startsAt: new Date(Date.UTC(2026, 8, 12, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 12, 2, 0, 0)),
      marks: [{ enrollmentId: first.enrollmentId, status: AttendanceStatus.Late }],
    });
    await createCompletedSession({
      title: 'S4',
      startsAt: new Date(Date.UTC(2026, 8, 13, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 13, 2, 0, 0)),
      marks: [{ enrollmentId: first.enrollmentId, status: AttendanceStatus.Absent }],
    });
    await createCompletedSession({
      title: 'S5',
      startsAt: new Date(Date.UTC(2026, 8, 14, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 14, 2, 0, 0)),
      marks: [{ enrollmentId: first.enrollmentId, status: AttendanceStatus.Excused }],
    });

    const summary = await classOperationsService.getEnrollmentAttendanceSummary(first.enrollmentId);

    expect(summary).toEqual({
      enrollmentId: normalizeUuid(first.enrollmentId),
      totalSessions: 5,
      presentCount: 1,
      lateCount: 1,
      absentCount: 1,
      excusedCount: 1,
      unmarkedCount: 1,
      attendanceRatePercent: 40,
    });

    const history = await classOperationsService.listEnrollmentAttendanceHistory({
      enrollmentId: first.enrollmentId,
      page: 1,
      limit: 2,
    });

    expect(history.total).toBe(5);
    expect(history.page).toBe(1);
    expect(history.limit).toBe(2);
    expect(history.items).toHaveLength(2);
    expect(history.items[0]?.startsAt.getTime()).toBeGreaterThanOrEqual(
      history.items[1]?.startsAt.getTime() ?? 0,
    );

    const page2 = await classOperationsService.listEnrollmentAttendanceHistory({
      enrollmentId: first.enrollmentId,
      page: 2,
      limit: 2,
    });
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0]?.sessionId).not.toBe(history.items[0]?.sessionId);
  });

  it('preserves history after enrollment withdrawal', async () => {
    const completed = await createCompletedSession({
      title: 'Withdraw unmarked',
      startsAt: new Date(Date.UTC(2026, 8, 21, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 21, 2, 0, 0)),
    });

    const markedSession = await classOperationsService.createScheduledSessionForClass({
      classId,
      title: 'Withdraw marked',
      startsAt: new Date(Date.UTC(2026, 8, 23, 1, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 8, 23, 2, 0, 0)),
      createdByUserId: actorUserId,
    });
    await classOperationsService.bulkUpsertAttendanceFromClient(
      markedSession.id,
      [{ enrollmentId: completed.enrollmentId, status: AttendanceStatus.Present, note: 'keep' }],
      actorUserId,
    );
    await classOperationsService.completeSession(markedSession.id, actorUserId);

    try {
      await enrollmentService.updateEnrollmentStatus(
        completed.enrollmentId,
        EnrollmentStatus.Withdrawn,
      );

      const history = await classOperationsService.listEnrollmentAttendanceHistory({
        enrollmentId: completed.enrollmentId,
        page: 1,
        limit: 20,
      });

      expect(history.total).toBe(2);
      expect(
        history.items.some(
          (item) => normalizeUuid(item.sessionId) === normalizeUuid(markedSession.id),
        ),
      ).toBe(true);
      expect(history.items.some((item) => item.note === 'keep')).toBe(true);

      const summary = await classOperationsService.getEnrollmentAttendanceSummary(
        completed.enrollmentId,
      );
      expect(summary.totalSessions).toBe(2);
      expect(summary.presentCount).toBe(1);
      expect(summary.unmarkedCount).toBe(1);
      expect(summary.attendanceRatePercent).toBe(50);
    } finally {
      await AppDataSource.query(
        `UPDATE enrollments SET status = @0, left_at = NULL WHERE id = @1`,
        [EnrollmentStatus.Active, completed.enrollmentId],
      );
    }
  });
});
