import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ClassOperationsDemoSeedModule } from '../../src/database/seeds/class-operations-demo-seed.module';
import {
  CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL,
  CLASS_OPERATIONS_DEMO_PARENT_EMAIL,
  CLASS_OPERATIONS_DEMO_SESSION_TITLES,
  CLASS_OPERATIONS_DEMO_STUDENT_EMAIL,
} from '../../src/database/seeds/class-operations-demo.seed.constants';
import { ClassOperationsDemoSeedService } from '../../src/database/seeds/class-operations-demo.seed.service';
import { ClassCatechistAssignmentService } from '../../src/modules/class/services/class-catechist-assignment.service';
import { AttendanceStatus } from '../../src/modules/class-operations/enums/attendance-status.enum';
import { ClassSessionStatus } from '../../src/modules/class-operations/enums/class-session-status.enum';
import { ClassOperationsService } from '../../src/modules/class-operations/services/class-operations.service';
import { normalizeUuid } from '../../src/database/uuid-v4.util';
import { UsersModule } from '../../src/modules/users/users.module';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('ClassOperationsDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let seedService: ClassOperationsDemoSeedService;
  let classOperationsService: ClassOperationsService;
  let userAccountService: UserAccountService;
  let classCatechistAssignmentService: ClassCatechistAssignmentService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ClassOperationsDemoSeedModule, UsersModule],
    }).compile();

    seedService = moduleRef.get(ClassOperationsDemoSeedService);
    classOperationsService = moduleRef.get(ClassOperationsService);
    userAccountService = moduleRef.get(UserAccountService);
    classCatechistAssignmentService = moduleRef.get(ClassCatechistAssignmentService);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('seeds required Class Operations demo scenario on first run', async () => {
    const summary = await seedService.run();

    expect(summary.catechistEmail).toBe(CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL);
    expect(summary.parentEmail).toBe(CLASS_OPERATIONS_DEMO_PARENT_EMAIL);
    expect(summary.studentEmail).toBe(CLASS_OPERATIONS_DEMO_STUDENT_EMAIL);
    expect(summary.classId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.primaryEnrollmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.secondaryEnrollmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.completedCount).toBe(3);
    expect(summary.scheduledCount).toBe(1);
    expect(summary.cancelledCount).toBe(1);
    expect(summary.completedSessionIds).toHaveLength(3);

    const catechist = await userAccountService.findAccountSnapshotByEmail(
      CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL,
    );
    expect(catechist).not.toBeNull();
    if (catechist === null) {
      throw new Error('Expected demo catechist');
    }

    const assigned = await classCatechistAssignmentService.listAssignedClassIds(catechist.id);
    expect(assigned.map((id) => normalizeUuid(id))).toContain(normalizeUuid(summary.classId));

    const sessions = await classOperationsService.listSessionsByClass({
      classId: summary.classId,
      page: 1,
      limit: 50,
    });

    const byTitle = new Map(sessions.items.map((item) => [item.title, item] as const));
    expect(byTitle.get(CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedPresentLate)?.status).toBe(
      ClassSessionStatus.Completed,
    );
    expect(byTitle.get(CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedAbsentExcused)?.status).toBe(
      ClassSessionStatus.Completed,
    );
    expect(byTitle.get(CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedUnmarked)?.status).toBe(
      ClassSessionStatus.Completed,
    );
    expect(byTitle.get(CLASS_OPERATIONS_DEMO_SESSION_TITLES.scheduledUpcoming)?.status).toBe(
      ClassSessionStatus.Scheduled,
    );
    expect(byTitle.get(CLASS_OPERATIONS_DEMO_SESSION_TITLES.cancelled)?.status).toBe(
      ClassSessionStatus.Cancelled,
    );

    const history = await classOperationsService.listEnrollmentAttendanceHistory({
      enrollmentId: summary.primaryEnrollmentId,
      page: 1,
      limit: 20,
    });
    expect(history.total).toBe(3);

    const statuses = new Set(history.items.map((item) => item.attendanceStatus));
    expect(statuses.has(AttendanceStatus.Present)).toBe(true);
    expect(statuses.has(AttendanceStatus.Absent)).toBe(true);
    expect(statuses.has(null)).toBe(true);

    const summaryAgg = await classOperationsService.getEnrollmentAttendanceSummary(
      summary.primaryEnrollmentId,
    );
    expect(summaryAgg.totalSessions).toBe(3);
    expect(summaryAgg.presentCount).toBe(1);
    expect(summaryAgg.absentCount).toBe(1);
    expect(summaryAgg.unmarkedCount).toBe(1);
    expect(summaryAgg.attendanceRatePercent).toBe(33);

    const scheduledView = await classOperationsService.getSessionAttendanceView(
      summary.scheduledSessionId,
    );
    expect(scheduledView.session.status).toBe(ClassSessionStatus.Scheduled);
    expect(scheduledView.markedCount).toBe(0);
    expect(scheduledView.rosterCount).toBeGreaterThanOrEqual(2);
  });

  it('is idempotent on second run without duplicating demo sessions', async () => {
    const first = await seedService.run();
    const second = await seedService.run();

    expect(normalizeUuid(second.classId)).toBe(normalizeUuid(first.classId));
    expect(normalizeUuid(second.primaryEnrollmentId)).toBe(
      normalizeUuid(first.primaryEnrollmentId),
    );
    expect(second.completedSessionIds.map((id) => normalizeUuid(id)).sort()).toEqual(
      first.completedSessionIds.map((id) => normalizeUuid(id)).sort(),
    );
    expect(normalizeUuid(second.scheduledSessionId)).toBe(
      normalizeUuid(first.scheduledSessionId),
    );
    expect(normalizeUuid(second.cancelledSessionId)).toBe(
      normalizeUuid(first.cancelledSessionId),
    );
    expect(second.sessionsCreated).toBe(0);
    expect(second.sessionsExisting).toBeGreaterThanOrEqual(5);

    const sessions = await classOperationsService.listSessionsByClass({
      classId: second.classId,
      page: 1,
      limit: 50,
    });
    const demoTitles = Object.values(CLASS_OPERATIONS_DEMO_SESSION_TITLES);
    const demoRows = sessions.items.filter((item) =>
      demoTitles.includes(item.title as (typeof demoTitles)[number]),
    );
    expect(demoRows).toHaveLength(5);

    const attendanceRows = await AppDataSource.query<Array<{ cnt: number }>>(
      `SELECT COUNT(1) AS cnt FROM attendance_records WHERE session_id IN (${first.completedSessionIds
        .map((_, index) => `@${String(index)}`)
        .join(', ')})`,
      [...first.completedSessionIds],
    );
    expect(Number(attendanceRows[0]?.cnt ?? 0)).toBeGreaterThanOrEqual(4);

    const rosterRows = await AppDataSource.query<Array<{ cnt: number }>>(
      `SELECT COUNT(1) AS cnt FROM class_session_roster WHERE session_id = @0`,
      [first.scheduledSessionId],
    );
    expect(Number(rosterRows[0]?.cnt ?? 0)).toBeGreaterThanOrEqual(2);
  });
});
