import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { CatechismLevelStatus } from '../../src/modules/academic-structure/enums/catechism-level-status.enum';
import { QueryFailedError } from 'typeorm';
import {
  AcademicYearAlreadyExistsError,
  ActiveAcademicYearAlreadyExistsError,
  AcademicYearClosedImmutableError,
} from '../../src/modules/academic-structure/errors/academic-year.errors';
import { CatechismLevelCodeAlreadyExistsError } from '../../src/modules/academic-structure/errors/catechism-level.errors';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ParishStatus } from '../../src/modules/parish/enums/parish-status.enum';
import { ParishInactiveError } from '../../src/modules/parish/errors/parish.errors';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';

const TEST_CODE_PREFIX = 'par004-int-';

describe('Academic structure services integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let academicYearService: AcademicYearService;
  let catechismLevelService: CatechismLevelService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, ParishModule, AcademicStructureModule],
    }).compile();

    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE name LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates planned academic years and catechism levels for an active parish', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Giáo xứ Academic Structure',
    });

    const academicYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}2026-2027`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });

    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level-1`,
      name: 'Sơ Cấp 1',
      sortOrder: 1,
    });

    expect(academicYear.status).toBe(AcademicYearStatus.Planned);
    expect(catechismLevel.code).toBe(`${TEST_CODE_PREFIX}level-1`);
    expect(catechismLevel.status).toBe(CatechismLevelStatus.Active);
  });

  it('activates one academic year per parish and closes it afterward', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}year-flow`,
      name: 'Year Flow Parish',
    });

    const plannedYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}year-a`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });

    const activeYear = await academicYearService.updateAcademicYearStatus(
      plannedYear.id,
      AcademicYearStatus.Active,
    );
    expect(activeYear.status).toBe(AcademicYearStatus.Active);

    const secondYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}year-b`,
      startDate: '2027-09-01',
      endDate: '2028-06-30',
    });

    await expect(
      academicYearService.updateAcademicYearStatus(secondYear.id, AcademicYearStatus.Active),
    ).rejects.toBeInstanceOf(ActiveAcademicYearAlreadyExistsError);

    const closedYear = await academicYearService.updateAcademicYearStatus(
      activeYear.id,
      AcademicYearStatus.Closed,
    );
    expect(closedYear.status).toBe(AcademicYearStatus.Closed);

    await expect(
      academicYearService.updateAcademicYear(closedYear.id, { name: 'Updated Name' }),
    ).rejects.toBeInstanceOf(AcademicYearClosedImmutableError);
  });

  it('maps duplicate names and codes to domain errors', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}dup`,
      name: 'Duplicate Parish',
    });

    await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}same-year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });

    await expect(
      academicYearService.createAcademicYear(parish.id, {
        name: `${TEST_CODE_PREFIX}same-year`,
        startDate: '2027-09-01',
        endDate: '2028-06-30',
      }),
    ).rejects.toBeInstanceOf(AcademicYearAlreadyExistsError);

    await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}dup-code`,
      name: 'Level One',
      sortOrder: 1,
    });

    await expect(
      catechismLevelService.createCatechismLevel(parish.id, {
        code: `${TEST_CODE_PREFIX}dup-code`,
        name: 'Level Two',
        sortOrder: 2,
      }),
    ).rejects.toBeInstanceOf(CatechismLevelCodeAlreadyExistsError);
  });

  it('returns exact YYYY-MM-DD dates from service snapshots', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}dates`,
      name: 'Date Parish',
    });

    const created = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}dates-year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });

    const loaded = await academicYearService.getAcademicYearById(created.id);

    expect(loaded.startDate).toBe('2026-09-01');
    expect(loaded.endDate).toBe('2027-06-30');
    expect(loaded.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(loaded.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('allows only one concurrent activation per parish', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}concurrent`,
      name: 'Concurrent Parish',
    });

    const firstPlannedYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}concurrent-a`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const secondPlannedYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}concurrent-b`,
      startDate: '2027-09-01',
      endDate: '2028-06-30',
    });

    const activationResults = await Promise.allSettled([
      academicYearService.updateAcademicYearStatus(firstPlannedYear.id, AcademicYearStatus.Active),
      academicYearService.updateAcademicYearStatus(secondPlannedYear.id, AcademicYearStatus.Active),
    ]);

    const fulfilledCount = activationResults.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    const rejectedResults = activationResults.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilledCount).toBe(1);
    expect(rejectedResults).toHaveLength(1);

    const rejectionReason: unknown = rejectedResults[0]?.reason;
    const isExpectedActivationConflict =
      rejectionReason instanceof ActiveAcademicYearAlreadyExistsError ||
      (rejectionReason instanceof QueryFailedError &&
        (rejectionReason.message.includes('UQ_academic_years_parish_id_active') ||
          rejectionReason.message.includes('deadlock')));

    expect(isExpectedActivationConflict).toBe(true);

    const activeYears = await academicYearService.listAcademicYearsByParish(parish.id, {
      page: 1,
      limit: 20,
      sortBy: 'startDate',
      sort: 'ASC',
      status: AcademicYearStatus.Active,
    });

    expect(activeYears.total).toBe(1);
  });

  it('blocks mutations on inactive parishes but allows catechism level deactivation', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}inactive`,
      name: 'Inactive Parish',
    });

    const level = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}inactive-level`,
      name: 'Inactive Level',
      sortOrder: 1,
    });

    await parishService.updateParishStatus(parish.id, ParishStatus.Inactive);

    await expect(
      academicYearService.createAcademicYear(parish.id, {
        name: `${TEST_CODE_PREFIX}blocked-year`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      }),
    ).rejects.toBeInstanceOf(ParishInactiveError);

    const deactivated = await catechismLevelService.updateCatechismLevelStatus(
      level.id,
      CatechismLevelStatus.Inactive,
    );
    expect(deactivated.status).toBe(CatechismLevelStatus.Inactive);
  });
});
