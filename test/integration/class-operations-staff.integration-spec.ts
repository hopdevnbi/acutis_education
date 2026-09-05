import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_CLASS_A_CODE } from '../../src/database/seeds/class-enrollment.seed.constants';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import { AUTH_RBAC_SEED_USERS } from '../../src/database/seeds/auth-rbac.seed.constants';
import { ClassOperationsModule } from '../../src/modules/class-operations/class-operations.module';
import { ClassOperationsService } from '../../src/modules/class-operations/services/class-operations.service';
import { AttendanceStatus } from '../../src/modules/class-operations/enums/attendance-status.enum';
import { ClassSessionStatus } from '../../src/modules/class-operations/enums/class-session-status.enum';
import { ClassService } from '../../src/modules/class/services/class.service';
import { deleteClassOperationsRowsForParishCode } from './helpers/delete-class-operations-rows-for-parish-code.util';

describe('Class operations staff service integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let classOperationsService: ClassOperationsService;
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
  });

  it('creates session with roster freeze and supports bulk upsert + lifecycle lock', async () => {
    const startsAt = new Date(Date.UTC(2026, 8, 10, 1, 0, 0));
    const endsAt = new Date(Date.UTC(2026, 8, 10, 2, 0, 0));

    const created = await classOperationsService.createScheduledSessionForClass({
      classId,
      title: 'Integration Week 1',
      startsAt,
      endsAt,
      createdByUserId: actorUserId,
    });

    expect(created.status).toBe(ClassSessionStatus.Scheduled);
    expect(created.rosterCount).toBeGreaterThan(0);

    const attendance = await classOperationsService.getSessionAttendanceView(created.id);
    expect(attendance.items.length).toBe(created.rosterCount);

    const first = attendance.items[0];
    if (first === undefined) {
      throw new Error('Expected roster item');
    }

    const upserted = await classOperationsService.bulkUpsertAttendanceFromClient(
      created.id,
      [{ enrollmentId: first.enrollmentId, status: AttendanceStatus.Present, note: 'ok' }],
      actorUserId,
    );

    expect(upserted.markedCount).toBe(1);
    expect(upserted.unmarkedCount).toBe(created.rosterCount - 1);

    await expect(classOperationsService.refreshSessionRoster(created.id)).rejects.toThrow();

    const completed = await classOperationsService.completeSession(created.id, actorUserId);
    expect(completed.status).toBe(ClassSessionStatus.Completed);

    await expect(
      classOperationsService.bulkUpsertAttendanceFromClient(
        created.id,
        [{ enrollmentId: first.enrollmentId, status: AttendanceStatus.Absent }],
        actorUserId,
      ),
    ).rejects.toThrow();
  });
});
