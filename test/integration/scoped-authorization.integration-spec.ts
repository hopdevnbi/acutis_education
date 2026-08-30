import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { CatechistAssignmentRole } from '../../src/modules/class/enums/catechist-assignment-role.enum';
import { ClassStatus } from '../../src/modules/class/enums/class-status.enum';
import { ClassCatechistAssignmentService } from '../../src/modules/class/services/class-catechist-assignment.service';
import { ClassScopeService } from '../../src/modules/class/services/class-scope.service';
import { ClassService } from '../../src/modules/class/services/class.service';
import { EnrollmentAccessService } from '../../src/modules/enrollment/services/enrollment-access.service';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { ParishMembershipStatus } from '../../src/modules/parish/enums/parish-membership-status.enum';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishScopeService } from '../../src/modules/parish/services/parish-scope.service';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { StudentModule } from '../../src/modules/student/student.module';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';
import { ClassDomainScopeModule } from '../../src/modules/enrollment/class-domain-scope.module';

const TEST_PREFIX = 'cls006-int-';
const DUMMY_PASSWORD = 'SecurePassword123!';

describe('Scoped authorization integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishScopeService: ParishScopeService;
  let classScopeService: ClassScopeService;
  let enrollmentAccessService: EnrollmentAccessService;
  let enrollmentService: EnrollmentService;
  let classCatechistAssignmentService: ClassCatechistAssignmentService;
  let studentService: StudentService;
  let classService: ClassService;
  let userAccountService: UserAccountService;
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
      imports: [
        ApplicationConfigModule,
        DatabaseModule,
        UsersModule,
        ParishModule,
        AcademicStructureModule,
        ClassModule,
        StudentModule,
        EnrollmentModule,
        ClassDomainScopeModule,
      ],
    }).compile();

    parishScopeService = moduleRef.get(ParishScopeService);
    classScopeService = moduleRef.get(ClassScopeService);
    enrollmentAccessService = moduleRef.get(EnrollmentAccessService);
    enrollmentService = moduleRef.get(EnrollmentService);
    classCatechistAssignmentService = moduleRef.get(ClassCatechistAssignmentService);
    studentService = moduleRef.get(StudentService);
    classService = moduleRef.get(ClassService);
    userAccountService = moduleRef.get(UserAccountService);
    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_PREFIX}%'
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE '${TEST_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE '${TEST_PREFIX}%'
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

  async function seedScopedFixture(): Promise<{
    parishId: string;
    classId: string;
    studentId: string;
    adminUserId: string;
    outsiderUserId: string;
    catechistUserId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_PREFIX}parish`,
      name: 'Scope Parish',
    });
    const academicYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_PREFIX}year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const activatedYear = await academicYearService.updateAcademicYearStatus(
      academicYear.id,
      AcademicYearStatus.Active,
    );
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    const createdClass = await classService.createClass(parish.id, {
      academicYearId: activatedYear.id,
      catechismLevelId: catechismLevel.id,
      code: `${TEST_PREFIX}class-a`,
      name: 'Class A',
    });
    const activeClass = await classService.updateClassStatus(createdClass.id, ClassStatus.Active);
    const student = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Scoped Student`,
    });
    await enrollmentService.enrollStudent(activeClass.id, student.id);

    const adminAccount = await userAccountService.createAccount({
      email: `${TEST_PREFIX}admin@example.com`,
      password: DUMMY_PASSWORD,
    });
    const outsiderAccount = await userAccountService.createAccount({
      email: `${TEST_PREFIX}outsider@example.com`,
      password: DUMMY_PASSWORD,
    });
    const catechistAccount = await userAccountService.createAccount({
      email: `${TEST_PREFIX}catechist@example.com`,
      password: DUMMY_PASSWORD,
    });

    await AppDataSource.query(`
      INSERT INTO parish_memberships (id, parish_id, user_id, status, joined_at, ended_at, created_at, updated_at)
      VALUES (NEWID(), '${parish.id}', '${adminAccount.id}', '${ParishMembershipStatus.Active}', GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE())
    `);

    await classCatechistAssignmentService.assignCatechist(activeClass.id, {
      catechistUserId: catechistAccount.id,
      assignmentRole: CatechistAssignmentRole.Lead,
    });

    return {
      parishId: parish.id,
      classId: activeClass.id,
      studentId: student.id,
      adminUserId: adminAccount.id,
      outsiderUserId: outsiderAccount.id,
      catechistUserId: catechistAccount.id,
    };
  }

  it('allows parish admins and assigned catechists to read a class', async () => {
    const { classId, adminUserId, catechistUserId, outsiderUserId } = await seedScopedFixture();

    await expect(
      classScopeService.assertCanReadClass(adminUserId, classId),
    ).resolves.toBeUndefined();
    await expect(
      classScopeService.assertCanReadClass(catechistUserId, classId),
    ).resolves.toBeUndefined();
    await expect(classScopeService.assertCanReadClass(outsiderUserId, classId)).rejects.toThrow();
  });

  it('allows parish admins to manage classes and denies outsiders', async () => {
    const { classId, adminUserId, outsiderUserId } = await seedScopedFixture();

    await expect(
      classScopeService.assertCanManageClass(adminUserId, classId),
    ).resolves.toBeUndefined();
    await expect(classScopeService.assertCanManageClass(outsiderUserId, classId)).rejects.toThrow();
  });

  it('scopes student reads to parish admins and assigned catechists', async () => {
    const { studentId, adminUserId, catechistUserId, outsiderUserId } = await seedScopedFixture();

    await expect(
      enrollmentAccessService.assertCanReadStudent(adminUserId, studentId),
    ).resolves.toBeUndefined();
    await expect(
      enrollmentAccessService.assertCanReadStudent(catechistUserId, studentId),
    ).resolves.toBeUndefined();
    await expect(
      enrollmentAccessService.assertCanReadStudent(outsiderUserId, studentId),
    ).rejects.toThrow();
  });

  it('scopes parish read access for admins and catechists', async () => {
    const { parishId, adminUserId, catechistUserId, outsiderUserId } = await seedScopedFixture();

    await expect(
      parishScopeService.assertCanManageParish(adminUserId, parishId),
    ).resolves.toBeUndefined();
    expect(await classScopeService.canReadParishAsCatechist(catechistUserId, parishId)).toBe(true);
    expect(await parishScopeService.hasActiveParishMembership(outsiderUserId, parishId)).toBe(
      false,
    );
  });
});
