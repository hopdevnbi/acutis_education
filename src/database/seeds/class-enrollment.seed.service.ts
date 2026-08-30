import { Injectable, Logger } from '@nestjs/common';
import { AcademicYearStatus } from '../../modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../modules/academic-structure/services/catechism-level.service';
import { CatechistAssignmentRole } from '../../modules/class/enums/catechist-assignment-role.enum';
import { ClassStatus } from '../../modules/class/enums/class-status.enum';
import { ClassCodeAlreadyExistsError } from '../../modules/class/errors/class.errors';
import { CatechistAssignmentAlreadyActiveError } from '../../modules/class/errors/class-catechist-assignment.errors';
import { ClassCatechistAssignmentService } from '../../modules/class/services/class-catechist-assignment.service';
import { ClassService } from '../../modules/class/services/class.service';
import type { ClassSnapshot } from '../../modules/class/interfaces/class.interface';
import { EnrollmentStatus } from '../../modules/enrollment/enums/enrollment-status.enum';
import { StudentAlreadyEnrolledInParishYearError } from '../../modules/enrollment/errors/enrollment.errors';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { ParishMembershipService } from '../../modules/parish/services/parish-membership.service';
import { ParishScopeService } from '../../modules/parish/services/parish-scope.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { GuardianRelationshipType } from '../../modules/student/enums/guardian-relationship-type.enum';
import {
  GuardianLinkAlreadyActiveError,
  GuardianPrimaryAlreadyAssignedError,
} from '../../modules/student/errors/student-guardian.errors';
import { StudentGuardianService } from '../../modules/student/services/student-guardian.service';
import { StudentService } from '../../modules/student/services/student.service';
import type { StudentSnapshot } from '../../modules/student/interfaces/student.interface';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
} from './parish-academic.seed.constants';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_CLASS_A_NAME,
  CLASS_ENROLLMENT_DEMO_CLASS_B_CODE,
  CLASS_ENROLLMENT_DEMO_CLASS_B_NAME,
  CLASS_ENROLLMENT_DEMO_LEVEL_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME,
  CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from './class-enrollment.seed.constants';

export class ClassEnrollmentSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassEnrollmentSeedPrerequisiteError';
  }
}

export interface ClassEnrollmentSeedSummary {
  parishMembershipCreated: boolean;
  parishMembershipExisting: boolean;
  classesCreated: number;
  classesExisting: number;
  classesActivated: number;
  studentsCreated: number;
  studentsExisting: number;
  guardianLinksCreated: number;
  guardianLinksExisting: number;
  catechistAssignmentsCreated: number;
  catechistAssignmentsExisting: number;
  enrollmentsCreated: number;
  enrollmentsExisting: number;
  transferHistoryEnsured: boolean;
}

@Injectable()
export class ClassEnrollmentSeedService {
  private readonly logger = new Logger(ClassEnrollmentSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly academicYearService: AcademicYearService,
    private readonly catechismLevelService: CatechismLevelService,
    private readonly parishMembershipService: ParishMembershipService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
  ) {}

  async run(): Promise<ClassEnrollmentSeedSummary> {
    const summary: ClassEnrollmentSeedSummary = {
      parishMembershipCreated: false,
      parishMembershipExisting: false,
      classesCreated: 0,
      classesExisting: 0,
      classesActivated: 0,
      studentsCreated: 0,
      studentsExisting: 0,
      guardianLinksCreated: 0,
      guardianLinksExisting: 0,
      catechistAssignmentsCreated: 0,
      catechistAssignmentsExisting: 0,
      enrollmentsCreated: 0,
      enrollmentsExisting: 0,
      transferHistoryEnsured: false,
    };

    const parish = await this.findDemoParish();
    const academicYear = await this.findActiveDemoAcademicYear(parish.id);
    const catechismLevel = await this.findDemoCatechismLevel(parish.id);
    const adminUser = await this.requireSeedUser(
      CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
      'npm run seed:auth-rbac',
    );
    const catechistUser = await this.requireSeedUser(
      CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
      'npm run seed:auth-rbac',
    );
    const parentUser = await this.requireSeedUser(
      CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
      'npm run seed:auth-rbac',
    );

    const hadParishMembership = await this.parishScopeService.hasActiveParishMembership(
      adminUser.id,
      parish.id,
    );
    await this.parishMembershipService.ensureActiveMembership(parish.id, adminUser.id);

    if (hadParishMembership) {
      summary.parishMembershipExisting = true;
      this.logger.log(`Parish membership for ${CLASS_ENROLLMENT_SEED_ADMIN_EMAIL} already active.`);
    } else {
      summary.parishMembershipCreated = true;
      this.logger.log(`Created parish membership for ${CLASS_ENROLLMENT_SEED_ADMIN_EMAIL}.`);
    }

    const classA = await this.ensureDemoClass(
      parish.id,
      academicYear.id,
      catechismLevel.id,
      CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
      CLASS_ENROLLMENT_DEMO_CLASS_A_NAME,
      summary,
    );
    const classB = await this.ensureDemoClass(
      parish.id,
      academicYear.id,
      catechismLevel.id,
      CLASS_ENROLLMENT_DEMO_CLASS_B_CODE,
      CLASS_ENROLLMENT_DEMO_CLASS_B_NAME,
      summary,
    );

    await this.ensureClassActive(classA, summary);
    await this.ensureClassActive(classB, summary);

    const studentAlpha = await this.ensureDemoStudent(
      CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      summary,
    );
    const studentBeta = await this.ensureDemoStudent(
      CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME,
      summary,
    );

    await this.ensureGuardianLink(studentAlpha.id, parentUser.id, summary);
    await this.ensureGuardianLink(studentBeta.id, parentUser.id, summary);

    await this.ensureCatechistAssignment(classA.id, catechistUser.id, summary);
    await this.ensureCatechistAssignment(classB.id, catechistUser.id, summary);

    await this.ensureActiveEnrollment(classA.id, studentAlpha.id, summary);

    summary.transferHistoryEnsured = await this.ensureTransferHistory(
      studentBeta.id,
      classB.id,
      classA.id,
      summary,
    );

    return summary;
  }

  private async findDemoParish(): Promise<Awaited<ReturnType<ParishService['getParishById']>>> {
    const parishList = await this.parishService.listParishes({
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
      throw new ClassEnrollmentSeedPrerequisiteError(
        `Demo parish "${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.parishService.getParishById(parish.id);
  }

  private async findActiveDemoAcademicYear(
    parishId: string,
  ): Promise<Awaited<ReturnType<AcademicYearService['getAcademicYearById']>>> {
    const yearList = await this.academicYearService.listAcademicYearsByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'name',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
    });
    const activeYear = yearList.items.find(
      (item) =>
        item.name === PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME &&
        item.status === AcademicYearStatus.Active,
    );

    if (activeYear === undefined) {
      throw new ClassEnrollmentSeedPrerequisiteError(
        `Active demo academic year "${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.academicYearService.getAcademicYearById(activeYear.id);
  }

  private async findDemoCatechismLevel(
    parishId: string,
  ): Promise<Awaited<ReturnType<CatechismLevelService['getCatechismLevelById']>>> {
    const levelList = await this.catechismLevelService.listCatechismLevelsByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'sortOrder',
      sort: 'ASC',
      search: CLASS_ENROLLMENT_DEMO_LEVEL_CODE,
    });
    const level = levelList.items.find((item) => item.code === CLASS_ENROLLMENT_DEMO_LEVEL_CODE);

    if (level === undefined) {
      throw new ClassEnrollmentSeedPrerequisiteError(
        `Demo catechism level "${CLASS_ENROLLMENT_DEMO_LEVEL_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.catechismLevelService.getCatechismLevelById(level.id);
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<Awaited<ReturnType<UserAccountService['getAccountSnapshotById']>> & { id: string }> {
    const account = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (account === null) {
      throw new ClassEnrollmentSeedPrerequisiteError(
        `Sample user "${email}" not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return account;
  }

  private async ensureDemoClass(
    parishId: string,
    academicYearId: string,
    catechismLevelId: string,
    code: string,
    name: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<ClassSnapshot> {
    try {
      const createdClass = await this.classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code,
        name,
      });
      summary.classesCreated += 1;
      this.logger.log(`Created demo class ${code}.`);

      return createdClass;
    } catch (error: unknown) {
      if (!(error instanceof ClassCodeAlreadyExistsError)) {
        throw error;
      }

      summary.classesExisting += 1;
      this.logger.log(`Demo class ${code} already exists.`);

      const existingClass = await this.findClassByCode(parishId, code);

      if (existingClass === null) {
        throw error;
      }

      return existingClass;
    }
  }

  private async findClassByCode(parishId: string, code: string): Promise<ClassSnapshot | null> {
    const listResult = await this.classService.listClassesByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'code',
      sort: 'ASC',
      search: code,
    });

    const exactMatch = listResult.items.find((snapshot) => snapshot.code === code);

    return exactMatch ?? null;
  }

  private async ensureClassActive(
    classSnapshot: ClassSnapshot,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<void> {
    if (classSnapshot.status === ClassStatus.Active) {
      return;
    }

    await this.classService.updateClassStatus(classSnapshot.id, ClassStatus.Active);
    summary.classesActivated += 1;
    this.logger.log(`Activated demo class ${classSnapshot.code}.`);
  }

  private async ensureDemoStudent(
    fullName: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<StudentSnapshot> {
    const existingStudent = await this.findStudentByFullName(fullName);

    if (existingStudent !== null) {
      summary.studentsExisting += 1;
      this.logger.log(`Demo student "${fullName}" already exists.`);

      return existingStudent;
    }

    const createdStudent = await this.studentService.createStudent({ fullName });
    summary.studentsCreated += 1;
    this.logger.log(`Created demo student "${fullName}".`);

    return createdStudent;
  }

  private async findStudentByFullName(fullName: string): Promise<StudentSnapshot | null> {
    const listResult = await this.studentService.listStudents({
      page: 1,
      limit: 5,
      sortBy: 'fullName',
      sort: 'ASC',
      search: fullName,
    });

    const exactMatch = listResult.items.find((snapshot) => snapshot.fullName === fullName);

    return exactMatch ?? null;
  }

  private async ensureGuardianLink(
    studentId: string,
    guardianUserId: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<void> {
    try {
      await this.studentGuardianService.linkGuardian(studentId, {
        guardianUserId,
        relationshipType: GuardianRelationshipType.Parent,
        isPrimary: true,
      });
      summary.guardianLinksCreated += 1;
      this.logger.log(
        `Linked guardian ${CLASS_ENROLLMENT_SEED_PARENT_EMAIL} to student ${studentId}.`,
      );
    } catch (error: unknown) {
      if (
        error instanceof GuardianLinkAlreadyActiveError ||
        error instanceof GuardianPrimaryAlreadyAssignedError
      ) {
        summary.guardianLinksExisting += 1;
        this.logger.log(`Guardian link for student ${studentId} already active.`);

        return;
      }

      throw error;
    }
  }

  private async ensureCatechistAssignment(
    classId: string,
    catechistUserId: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<void> {
    try {
      await this.classCatechistAssignmentService.assignCatechist(classId, {
        catechistUserId,
        assignmentRole: CatechistAssignmentRole.Lead,
      });
      summary.catechistAssignmentsCreated += 1;
      this.logger.log(`Assigned catechist to class ${classId}.`);
    } catch (error: unknown) {
      if (error instanceof CatechistAssignmentAlreadyActiveError) {
        summary.catechistAssignmentsExisting += 1;
        this.logger.log(`Catechist already assigned to class ${classId}.`);

        return;
      }

      throw error;
    }
  }

  private async ensureActiveEnrollment(
    classId: string,
    studentId: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<void> {
    try {
      await this.enrollmentService.enrollStudent(classId, studentId);
      summary.enrollmentsCreated += 1;
      this.logger.log(`Enrolled student ${studentId} in class ${classId}.`);
    } catch (error: unknown) {
      if (error instanceof StudentAlreadyEnrolledInParishYearError) {
        summary.enrollmentsExisting += 1;
        this.logger.log(
          `Student ${studentId} already has an active enrollment for this parish year.`,
        );

        return;
      }

      throw error;
    }
  }

  private async ensureTransferHistory(
    studentId: string,
    sourceClassId: string,
    targetClassId: string,
    summary: ClassEnrollmentSeedSummary,
  ): Promise<boolean> {
    const history = await this.enrollmentService.listEnrollmentsByStudent(studentId, {
      page: 1,
      limit: 20,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });

    const hasTransferred = history.items.some(
      (enrollment) => enrollment.status === EnrollmentStatus.Transferred,
    );
    const hasActiveInTarget = history.items.some(
      (enrollment) =>
        enrollment.status === EnrollmentStatus.Active && enrollment.classId === targetClassId,
    );

    if (hasTransferred && hasActiveInTarget) {
      this.logger.log(`Transfer history for student ${studentId} already present.`);

      return true;
    }

    let activeSourceEnrollment = history.items.find(
      (enrollment) =>
        enrollment.status === EnrollmentStatus.Active && enrollment.classId === sourceClassId,
    );

    if (activeSourceEnrollment === undefined) {
      try {
        activeSourceEnrollment = await this.enrollmentService.enrollStudent(
          sourceClassId,
          studentId,
        );
        summary.enrollmentsCreated += 1;
      } catch (error: unknown) {
        if (error instanceof StudentAlreadyEnrolledInParishYearError) {
          const refreshedHistory = await this.enrollmentService.listEnrollmentsByStudent(
            studentId,
            {
              page: 1,
              limit: 20,
              sortBy: 'enrolledAt',
              sort: 'DESC',
            },
          );
          activeSourceEnrollment = refreshedHistory.items.find(
            (enrollment) => enrollment.status === EnrollmentStatus.Active,
          );

          if (activeSourceEnrollment === undefined) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    if (activeSourceEnrollment.classId === targetClassId) {
      this.logger.log(`Student ${studentId} is already active in target class ${targetClassId}.`);

      return hasTransferred;
    }

    await this.enrollmentService.transferEnrollment(activeSourceEnrollment.id, {
      targetClassId,
    });
    summary.enrollmentsCreated += 1;
    this.logger.log(`Created transfer history for student ${studentId}.`);

    return true;
  }
}
