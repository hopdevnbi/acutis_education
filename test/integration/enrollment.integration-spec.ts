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
import { CatechistAssignmentStatus } from '../../src/modules/class/enums/catechist-assignment-status.enum';
import { ClassStatus } from '../../src/modules/class/enums/class-status.enum';
import { ClassCatechistAssignmentService } from '../../src/modules/class/services/class-catechist-assignment.service';
import { ClassService } from '../../src/modules/class/services/class.service';
import { ClassDomainScopeModule } from '../../src/modules/enrollment/class-domain-scope.module';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import { EnrollmentStatus } from '../../src/modules/enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { StudentModule } from '../../src/modules/student/student.module';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_PREFIX = 'cls005-int-';
const DUMMY_PASSWORD = 'SecurePassword123!';

describe('Enrollment and catechist assignment integration (MSSQL)', () => {
  let moduleRef: TestingModule;
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

  async function seedActiveClassPair(): Promise<{
    classAId: string;
    classBId: string;
    parishId: string;
    academicYearId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_PREFIX}parish`,
      name: 'Enrollment Parish',
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
    const classA = await classService.createClass(parish.id, {
      academicYearId: activatedYear.id,
      catechismLevelId: catechismLevel.id,
      code: `${TEST_PREFIX}class-a`,
      name: 'Class A',
    });
    const classB = await classService.createClass(parish.id, {
      academicYearId: activatedYear.id,
      catechismLevelId: catechismLevel.id,
      code: `${TEST_PREFIX}class-b`,
      name: 'Class B',
    });
    const activeClassA = await classService.updateClassStatus(classA.id, ClassStatus.Active);
    const activeClassB = await classService.updateClassStatus(classB.id, ClassStatus.Active);

    return {
      classAId: activeClassA.id,
      classBId: activeClassB.id,
      parishId: parish.id,
      academicYearId: activatedYear.id,
    };
  }

  it('enrolls a student in an active class', async () => {
    const { classAId } = await seedActiveClassPair();
    const student = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Enrolled Student`,
    });

    const enrollment = await enrollmentService.enrollStudent(classAId, student.id);

    expect(enrollment.status).toBe(EnrollmentStatus.Active);
    expect(enrollment.classId).toBe(classAId);
  });

  it('transfers an active enrollment to another class in the same parish and year', async () => {
    const { classAId, classBId } = await seedActiveClassPair();
    const student = await studentService.createStudent({
      fullName: `${TEST_PREFIX}Transfer Student`,
    });
    const source = await enrollmentService.enrollStudent(classAId, student.id);

    const transferred = await enrollmentService.transferEnrollment(source.id, {
      targetClassId: classBId,
    });

    expect(transferred.status).toBe(EnrollmentStatus.Active);
    expect(transferred.classId).toBe(classBId);

    const sourceAfter = await enrollmentService.getEnrollmentById(source.id);
    expect(sourceAfter.status).toBe(EnrollmentStatus.Transferred);
  });

  it('assigns and ends a catechist on a class', async () => {
    const { classAId } = await seedActiveClassPair();
    const catechist = await userAccountService.createAccount({
      email: `${TEST_PREFIX}catechist@example.com`,
      password: DUMMY_PASSWORD,
    });

    const assignment = await classCatechistAssignmentService.assignCatechist(classAId, {
      catechistUserId: catechist.id,
      assignmentRole: CatechistAssignmentRole.Lead,
    });

    expect(assignment.status).toBe(CatechistAssignmentStatus.Active);

    const ended = await classCatechistAssignmentService.updateAssignmentStatus(
      assignment.id,
      CatechistAssignmentStatus.Ended,
    );

    expect(ended.status).toBe(CatechistAssignmentStatus.Ended);
  });
});
