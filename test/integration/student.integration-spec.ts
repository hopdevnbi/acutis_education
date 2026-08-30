import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { ClassService } from '../../src/modules/class/services/class.service';
import { ClassDomainScopeModule } from '../../src/modules/enrollment/class-domain-scope.module';
import { EnrollmentQueryService } from '../../src/modules/enrollment/services/enrollment-query.service';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { GuardianLinkStatus } from '../../src/modules/student/enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../../src/modules/student/enums/guardian-relationship-type.enum';
import { StudentStatus } from '../../src/modules/student/enums/student-status.enum';
import { StudentGuardianService } from '../../src/modules/student/services/student-guardian.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { StudentModule } from '../../src/modules/student/student.module';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_PREFIX = 'cls004-int-';
const DUMMY_PASSWORD = 'SecurePassword123!';

describe('Student services integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let studentService: StudentService;
  let studentGuardianService: StudentGuardianService;
  let enrollmentQueryService: EnrollmentQueryService;
  let userAccountService: UserAccountService;
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
        UsersModule,
        ParishModule,
        AcademicStructureModule,
        ClassModule,
        EnrollmentModule,
        ClassDomainScopeModule,
        StudentModule,
      ],
    }).compile();

    studentService = moduleRef.get(StudentService);
    studentGuardianService = moduleRef.get(StudentGuardianService);
    enrollmentQueryService = moduleRef.get(EnrollmentQueryService);
    userAccountService = moduleRef.get(UserAccountService);
    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    classService = moduleRef.get(ClassService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years WHERE name LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${TEST_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates and updates a student profile', async () => {
    const created = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Nguyễn Văn An`,
    });

    expect(created.status).toBe(StudentStatus.Active);

    const updated = await studentService.updateStudent(created.id, {
      fullName: `${TEST_PREFIX}Nguyễn Văn An Updated`,
      status: StudentStatus.Inactive,
    });

    expect(updated.fullName).toBe(`${TEST_PREFIX}Nguyễn Văn An Updated`);
    expect(updated.status).toBe(StudentStatus.Inactive);
  });

  it('links and ends a guardian relationship', async () => {
    const student = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Guardian Student`,
    });
    const guardian = await userAccountService.createAccount({
      email: `${TEST_PREFIX}guardian@example.com`,
      password: DUMMY_PASSWORD,
    });

    const link = await studentGuardianService.linkGuardian(student.id, {
      guardianUserId: guardian.id,
      relationshipType: GuardianRelationshipType.Parent,
      isPrimary: true,
    });

    expect(link.status).toBe(GuardianLinkStatus.Active);

    const ended = await studentGuardianService.updateGuardianLinkStatus(
      link.id,
      GuardianLinkStatus.Ended,
    );

    expect(ended.status).toBe(GuardianLinkStatus.Ended);
    expect(ended.endsAt).not.toBeNull();
  });

  it('lists distinct students with active enrollments in a parish', async () => {
    const parish = await parishService.createParish({
      code: `${TEST_PREFIX}parish`,
      name: 'Student Parish',
    });
    const academicYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_PREFIX}year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    const classSnapshot = await classService.createClass(parish.id, {
      academicYearId: academicYear.id,
      catechismLevelId: catechismLevel.id,
      code: `${TEST_PREFIX}class`,
      name: 'Class A',
    });
    const student = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Enrolled Student`,
    });

    await AppDataSource.query(
      `
        INSERT INTO enrollments (
          id, student_id, class_id, parish_id, academic_year_id, status, enrolled_at
        )
        VALUES (@0, @1, @2, @3, @4, @5, GETUTCDATE())
      `,
      [generateUuidV4(), student.id, classSnapshot.id, parish.id, academicYear.id, 'ACTIVE'],
    );

    const result = await enrollmentQueryService.listDistinctActiveStudentIdsInParish(parish.id, {
      page: 1,
      limit: 20,
      sortBy: 'fullName',
      sort: 'ASC',
    });

    expect(result.total).toBe(1);
    expect(result.studentIds[0]).toBe(student.id);
  });
});
