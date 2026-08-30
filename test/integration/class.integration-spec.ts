import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { ClassStatus } from '../../src/modules/class/enums/class-status.enum';
import {
  ClassAcademicYearNotOperationalError,
  ClassCodeAlreadyExistsError,
} from '../../src/modules/class/errors/class.errors';
import { ClassService } from '../../src/modules/class/services/class.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';

const TEST_CODE_PREFIX = 'cls003-int-';

describe('ClassService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let academicYearService: AcademicYearService;
  let catechismLevelService: CatechismLevelService;
  let classService: ClassService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ApplicationConfigModule,
        DatabaseModule,
        ParishModule,
        AcademicStructureModule,
        ClassModule,
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    classService = moduleRef.get(ClassService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years WHERE name LIKE '${TEST_CODE_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function seedParishYearLevel(): Promise<{
    parishId: string;
    academicYearId: string;
    catechismLevelId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Class Integration Parish',
    });
    const academicYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });

    return {
      parishId: parish.id,
      academicYearId: academicYear.id,
      catechismLevelId: catechismLevel.id,
    };
  }

  it('creates a class in PLANNED status with Vietnamese name', async () => {
    const { parishId, academicYearId, catechismLevelId } = await seedParishYearLevel();

    const snapshot = await classService.createClass(parishId, {
      academicYearId,
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}class-a`,
      name: 'Lớp Khai Tâm A',
    });

    expect(snapshot.status).toBe(ClassStatus.Planned);
    expect(snapshot.name).toBe('Lớp Khai Tâm A');
    expect(snapshot.parishId).toBe(parishId);
  });

  it('rejects class creation in CLOSED academic year', async () => {
    const { parishId, academicYearId, catechismLevelId } = await seedParishYearLevel();
    const activated = await academicYearService.updateAcademicYearStatus(
      academicYearId,
      AcademicYearStatus.Active,
    );
    await academicYearService.updateAcademicYearStatus(activated.id, AcademicYearStatus.Closed);

    await expect(
      classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code: `${TEST_CODE_PREFIX}closed-year`,
        name: 'Closed Year Class',
      }),
    ).rejects.toBeInstanceOf(ClassAcademicYearNotOperationalError);
  });

  it('maps duplicate class codes within parish and year to ClassCodeAlreadyExistsError', async () => {
    const { parishId, academicYearId, catechismLevelId } = await seedParishYearLevel();
    const duplicateCode = `${TEST_CODE_PREFIX}dup-code`;

    await classService.createClass(parishId, {
      academicYearId,
      catechismLevelId,
      code: duplicateCode,
      name: 'First Class',
    });

    await expect(
      classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code: duplicateCode,
        name: 'Second Class',
      }),
    ).rejects.toBeInstanceOf(ClassCodeAlreadyExistsError);
  });

  it('activates a class when parish, year, and level are ACTIVE', async () => {
    const { parishId, academicYearId, catechismLevelId } = await seedParishYearLevel();
    const created = await classService.createClass(parishId, {
      academicYearId,
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}activate`,
      name: 'Activate Class',
    });

    await academicYearService.updateAcademicYearStatus(academicYearId, AcademicYearStatus.Active);

    const activated = await classService.updateClassStatus(created.id, ClassStatus.Active);

    expect(activated.status).toBe(ClassStatus.Active);
  });

  it('lists classes filtered by academic year', async () => {
    const { parishId, academicYearId, catechismLevelId } = await seedParishYearLevel();

    await classService.createClass(parishId, {
      academicYearId,
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}list-a`,
      name: 'List Class A',
    });

    const result = await classService.listClassesByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sort: 'ASC',
      academicYearId,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.code).toBe(`${TEST_CODE_PREFIX}list-a`);
  });
});
