import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_CLASS_B_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME,
  CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from '../../src/database/seeds/class-enrollment.seed.constants';
import {
  ClassEnrollmentSeedPrerequisiteError,
  ClassEnrollmentSeedService,
} from '../../src/database/seeds/class-enrollment.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import {
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
} from '../../src/database/seeds/parish-academic.seed.constants';
import { EnrollmentStatus } from '../../src/modules/enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { ParishScopeService } from '../../src/modules/parish/services/parish-scope.service';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { ClassScopeService } from '../../src/modules/class/services/class-scope.service';
import { ClassService } from '../../src/modules/class/services/class.service';
import { EnrollmentAccessService } from '../../src/modules/enrollment/services/enrollment-access.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('ClassEnrollmentSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let authRbacSeedService: AuthRbacSeedService;
  let parishAcademicSeedService: ParishAcademicSeedService;
  let classEnrollmentSeedService: ClassEnrollmentSeedService;
  let parishService: ParishService;
  let parishScopeService: ParishScopeService;
  let classService: ClassService;
  let classScopeService: ClassScopeService;
  let studentService: StudentService;
  let enrollmentAccessService: EnrollmentAccessService;
  let enrollmentService: EnrollmentService;
  let userAccountService: UserAccountService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule, ParishAcademicSeedModule, ClassEnrollmentSeedModule],
    }).compile();

    authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    parishService = moduleRef.get(ParishService);
    parishScopeService = moduleRef.get(ParishScopeService);
    classService = moduleRef.get(ClassService);
    classScopeService = moduleRef.get(ClassScopeService);
    studentService = moduleRef.get(StudentService);
    enrollmentAccessService = moduleRef.get(EnrollmentAccessService);
    enrollmentService = moduleRef.get(EnrollmentService);
    userAccountService = moduleRef.get(UserAccountService);

    await authRbacSeedService.run();
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (
        SELECT id FROM students
        WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (
        SELECT id FROM classes
        WHERE code IN ('${CLASS_ENROLLMENT_DEMO_CLASS_A_CODE}', '${CLASS_ENROLLMENT_DEMO_CLASS_B_CODE}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (
        SELECT id FROM students
        WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM classes
      WHERE code IN ('${CLASS_ENROLLMENT_DEMO_CLASS_A_CODE}', '${CLASS_ENROLLMENT_DEMO_CLASS_B_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM students
      WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE code LIKE 'demo-level-%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE name = '${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('refuses to run when parish-academic prerequisites are missing', async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (
        SELECT id FROM students
        WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (
        SELECT id FROM classes
        WHERE code IN ('${CLASS_ENROLLMENT_DEMO_CLASS_A_CODE}', '${CLASS_ENROLLMENT_DEMO_CLASS_B_CODE}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (
        SELECT id FROM students
        WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM classes
      WHERE code IN ('${CLASS_ENROLLMENT_DEMO_CLASS_A_CODE}', '${CLASS_ENROLLMENT_DEMO_CLASS_B_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM students
      WHERE full_name IN ('${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}', '${CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME}')
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE code LIKE 'demo-level-%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE name = '${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}'
    `);
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);

    await expect(classEnrollmentSeedService.run()).rejects.toBeInstanceOf(
      ClassEnrollmentSeedPrerequisiteError,
    );
  });

  it('creates demo class domain data and scoped links on first run', async () => {
    await parishAcademicSeedService.run();

    const firstSummary = await classEnrollmentSeedService.run();

    expect(firstSummary.parishMembershipCreated).toBe(true);
    expect(firstSummary.classesCreated).toBe(2);
    expect(firstSummary.studentsCreated).toBe(2);
    expect(firstSummary.guardianLinksCreated).toBe(2);
    expect(firstSummary.catechistAssignmentsCreated).toBe(2);
    expect(firstSummary.enrollmentsCreated).toBeGreaterThanOrEqual(2);
    expect(firstSummary.transferHistoryEnsured).toBe(true);

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
    expect(parish).toBeDefined();

    const adminUser = await userAccountService.findAccountSnapshotByEmail(
      CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
    );
    const catechistUser = await userAccountService.findAccountSnapshotByEmail(
      CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
    );
    const parentUser = await userAccountService.findAccountSnapshotByEmail(
      CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
    );
    expect(adminUser).not.toBeNull();
    expect(catechistUser).not.toBeNull();
    expect(parentUser).not.toBeNull();

    await expect(
      parishScopeService.assertCanManageParish(adminUser!.id, parish!.id),
    ).resolves.toBeUndefined();

    const classList = await classService.listClassesByParish(parish!.id, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
    });
    const classA = classList.items.find((item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE);
    expect(classA).toBeDefined();

    await expect(
      classScopeService.assertCanReadClass(catechistUser!.id, classA!.id),
    ).resolves.toBeUndefined();

    const alphaStudent = (
      await studentService.listStudents({
        page: 1,
        limit: 5,
        sortBy: 'fullName',
        sort: 'ASC',
        search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      })
    ).items.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);
    expect(alphaStudent).toBeDefined();

    await expect(
      enrollmentAccessService.assertCanReadStudent(parentUser!.id, alphaStudent!.id),
    ).resolves.toBeUndefined();

    const betaStudent = (
      await studentService.listStudents({
        page: 1,
        limit: 5,
        sortBy: 'fullName',
        sort: 'ASC',
        search: CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME,
      })
    ).items.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME);
    expect(betaStudent).toBeDefined();

    const betaHistory = await enrollmentService.listEnrollmentsByStudent(betaStudent!.id, {
      page: 1,
      limit: 10,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    expect(betaHistory.items.some((item) => item.status === EnrollmentStatus.Transferred)).toBe(
      true,
    );
    expect(
      betaHistory.items.some(
        (item) => item.status === EnrollmentStatus.Active && item.classId === classA!.id,
      ),
    ).toBe(true);
  });

  it('is idempotent on second run', async () => {
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();

    const secondSummary = await classEnrollmentSeedService.run();

    expect(secondSummary.parishMembershipExisting).toBe(true);
    expect(secondSummary.classesExisting).toBe(2);
    expect(secondSummary.studentsExisting).toBe(2);
    expect(secondSummary.guardianLinksExisting).toBe(2);
    expect(secondSummary.catechistAssignmentsExisting).toBe(2);
    expect(secondSummary.transferHistoryEnsured).toBe(true);
  });
});
