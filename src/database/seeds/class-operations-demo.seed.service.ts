import { Injectable, Logger } from '@nestjs/common';
import { ClassCatechistAssignmentService } from '../../modules/class/services/class-catechist-assignment.service';
import { ClassService } from '../../modules/class/services/class.service';
import { AttendanceStatus } from '../../modules/class-operations/enums/attendance-status.enum';
import { ClassSessionStatus } from '../../modules/class-operations/enums/class-session-status.enum';
import { ClassOperationsService } from '../../modules/class-operations/services/class-operations.service';
import { EnrollmentStatus } from '../../modules/enrollment/enums/enrollment-status.enum';
import { StudentAlreadyEnrolledInParishYearError } from '../../modules/enrollment/errors/enrollment.errors';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { StudentService } from '../../modules/student/services/student.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import { AuthRbacSeedService } from './auth-rbac.seed.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
} from './class-enrollment.seed.constants';
import { ClassEnrollmentSeedService } from './class-enrollment.seed.service';
import {
  CLASS_OPERATIONS_DEMO_ADMIN_EMAIL,
  CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL,
  CLASS_OPERATIONS_DEMO_PARENT_EMAIL,
  CLASS_OPERATIONS_DEMO_SAMPLE_PASSWORD,
  CLASS_OPERATIONS_DEMO_SESSION_TITLES,
  CLASS_OPERATIONS_DEMO_STUDENT_EMAIL,
  CLASS_OPERATIONS_DEMO_STUDENT_GAMMA_NAME,
} from './class-operations-demo.seed.constants';
import { ParishAcademicSeedService } from './parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';

export class ClassOperationsDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassOperationsDemoSeedPrerequisiteError';
  }
}

export interface ClassOperationsDemoSeedSummary {
  readonly catechistEmail: string;
  readonly parentEmail: string;
  readonly studentEmail: string;
  readonly adminEmail: string;
  readonly samplePassword: string;
  readonly classId: string;
  readonly primaryEnrollmentId: string;
  readonly secondaryEnrollmentId: string;
  readonly completedSessionIds: readonly string[];
  readonly scheduledSessionId: string;
  readonly cancelledSessionId: string;
  readonly completedCount: number;
  readonly scheduledCount: number;
  readonly cancelledCount: number;
  readonly sessionsCreated: number;
  readonly sessionsExisting: number;
  readonly gammaStudentCreated: boolean;
  readonly gammaEnrollmentCreated: boolean;
}

/**
 * Composes auth/parish/class-enrollment seeds, then creates Class Operations-owned
 * demo sessions/attendance via ClassOperationsService (public facade only).
 */
@Injectable()
export class ClassOperationsDemoSeedService {
  private readonly logger = new Logger(ClassOperationsDemoSeedService.name);

  constructor(
    private readonly authRbacSeedService: AuthRbacSeedService,
    private readonly parishAcademicSeedService: ParishAcademicSeedService,
    private readonly classEnrollmentSeedService: ClassEnrollmentSeedService,
    private readonly parishService: ParishService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
    private readonly classOperationsService: ClassOperationsService,
  ) {}

  async run(): Promise<ClassOperationsDemoSeedSummary> {
    this.logger.log('Running Class Operations demo seed chain.');

    await this.authRbacSeedService.run();
    await this.parishAcademicSeedService.run();
    await this.classEnrollmentSeedService.run();

    const parish = await this.findDemoParish();
    const demoClass = await this.findDemoClass(parish.id);
    const catechist = await this.requireSeedUser(
      CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL,
      'npm run seed:auth-rbac',
    );
    await this.requireSeedUser(CLASS_OPERATIONS_DEMO_PARENT_EMAIL, 'npm run seed:auth-rbac');

    const assignedClassIds = await this.classCatechistAssignmentService.listAssignedClassIds(
      catechist.id,
    );
    if (!assignedClassIds.map((id) => id.toLowerCase()).includes(demoClass.id.toLowerCase())) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        'Demo catechist is not assigned to demo class A. Re-run npm run seed:class-enrollment.',
      );
    }

    const alphaStudent = await this.findStudentByName(CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);
    const primaryEnrollment = await this.findActiveEnrollment(alphaStudent.id, demoClass.id);

    const { studentId: gammaStudentId, created: gammaStudentCreated } =
      await this.ensureGammaStudent();
    const { enrollmentId: secondaryEnrollmentId, created: gammaEnrollmentCreated } =
      await this.ensureEnrollment(demoClass.id, gammaStudentId);
    // Intentionally do not link Gamma to the demo Parent — enables foreign-child denial demos.

    let sessionsCreated = 0;
    let sessionsExisting = 0;

    const completed1 = await this.ensureCompletedSession({
      classId: demoClass.id,
      actorUserId: catechist.id,
      title: CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedPresentLate,
      startsAt: new Date(Date.UTC(2026, 0, 10, 2, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 0, 10, 3, 0, 0)),
      marks: [
        {
          enrollmentId: primaryEnrollment.id,
          status: AttendanceStatus.Present,
          note: 'demo present',
        },
        {
          enrollmentId: secondaryEnrollmentId,
          status: AttendanceStatus.Late,
          note: 'demo late',
        },
      ],
      onCreated: () => {
        sessionsCreated += 1;
      },
      onExisting: () => {
        sessionsExisting += 1;
      },
    });

    const completed2 = await this.ensureCompletedSession({
      classId: demoClass.id,
      actorUserId: catechist.id,
      title: CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedAbsentExcused,
      startsAt: new Date(Date.UTC(2026, 0, 17, 2, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 0, 17, 3, 0, 0)),
      marks: [
        {
          enrollmentId: primaryEnrollment.id,
          status: AttendanceStatus.Absent,
          note: 'demo absent',
        },
        {
          enrollmentId: secondaryEnrollmentId,
          status: AttendanceStatus.Excused,
          note: 'demo excused',
        },
      ],
      onCreated: () => {
        sessionsCreated += 1;
      },
      onExisting: () => {
        sessionsExisting += 1;
      },
    });

    const completed3 = await this.ensureCompletedSession({
      classId: demoClass.id,
      actorUserId: catechist.id,
      title: CLASS_OPERATIONS_DEMO_SESSION_TITLES.completedUnmarked,
      startsAt: new Date(Date.UTC(2026, 0, 24, 2, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 0, 24, 3, 0, 0)),
      marks: [],
      onCreated: () => {
        sessionsCreated += 1;
      },
      onExisting: () => {
        sessionsExisting += 1;
      },
    });

    const cancelled = await this.ensureCancelledSession({
      classId: demoClass.id,
      actorUserId: catechist.id,
      title: CLASS_OPERATIONS_DEMO_SESSION_TITLES.cancelled,
      startsAt: new Date(Date.UTC(2026, 0, 31, 2, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 0, 31, 3, 0, 0)),
      onCreated: () => {
        sessionsCreated += 1;
      },
      onExisting: () => {
        sessionsExisting += 1;
      },
    });

    const scheduled = await this.ensureScheduledSession({
      classId: demoClass.id,
      actorUserId: catechist.id,
      title: CLASS_OPERATIONS_DEMO_SESSION_TITLES.scheduledUpcoming,
      startsAt: new Date(Date.UTC(2026, 11, 5, 2, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 11, 5, 3, 0, 0)),
      onCreated: () => {
        sessionsCreated += 1;
      },
      onExisting: () => {
        sessionsExisting += 1;
      },
    });

    const summary: ClassOperationsDemoSeedSummary = {
      catechistEmail: CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL,
      parentEmail: CLASS_OPERATIONS_DEMO_PARENT_EMAIL,
      studentEmail: CLASS_OPERATIONS_DEMO_STUDENT_EMAIL,
      adminEmail: CLASS_OPERATIONS_DEMO_ADMIN_EMAIL,
      samplePassword: CLASS_OPERATIONS_DEMO_SAMPLE_PASSWORD,
      classId: demoClass.id,
      primaryEnrollmentId: primaryEnrollment.id,
      secondaryEnrollmentId,
      completedSessionIds: [completed1, completed2, completed3],
      scheduledSessionId: scheduled,
      cancelledSessionId: cancelled,
      completedCount: 3,
      scheduledCount: 1,
      cancelledCount: 1,
      sessionsCreated,
      sessionsExisting,
      gammaStudentCreated,
      gammaEnrollmentCreated,
    };

    this.logger.log(
      `Class Operations demo ready. classId=${summary.classId} primaryEnrollment=${summary.primaryEnrollmentId} completed=${String(summary.completedCount)} scheduled=${String(summary.scheduledCount)} cancelled=${String(summary.cancelledCount)} created=${String(sessionsCreated)} existing=${String(sessionsExisting)}.`,
    );

    return summary;
  }

  private async findDemoParish(): Promise<{ id: string }> {
    const parishes = await this.parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishes.items.find((item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE);

    if (parish === undefined) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        'Demo parish not found. Run npm run seed:parish-academic first.',
      );
    }

    return parish;
  }

  private async findDemoClass(parishId: string): Promise<{ id: string }> {
    const classes = await this.classService.listClassesByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
      search: CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
    });
    const demoClass = classes.items.find(
      (item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
    );

    if (demoClass === undefined) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        'Demo class A not found. Run npm run seed:class-enrollment first.',
      );
    }

    return demoClass;
  }

  private async findStudentByName(fullName: string): Promise<{ id: string }> {
    const students = await this.studentService.listStudents({
      page: 1,
      limit: 5,
      sortBy: 'fullName',
      sort: 'ASC',
      search: fullName,
    });
    const student = students.items.find((item) => item.fullName === fullName);

    if (student === undefined) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        `Demo student "${fullName}" not found. Run npm run seed:class-enrollment first.`,
      );
    }

    return student;
  }

  private async findActiveEnrollment(
    studentId: string,
    classId: string,
  ): Promise<{ id: string }> {
    const enrollments = await this.enrollmentService.listEnrollmentsByStudent(studentId, {
      page: 1,
      limit: 20,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    const enrollment = enrollments.items.find(
      (item) =>
        item.classId.toLowerCase() === classId.toLowerCase() &&
        item.status === EnrollmentStatus.Active,
    );

    if (enrollment === undefined) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        'Active demo enrollment not found for student on class A.',
      );
    }

    return enrollment;
  }

  private async ensureGammaStudent(): Promise<{ studentId: string; created: boolean }> {
    const students = await this.studentService.listStudents({
      page: 1,
      limit: 5,
      sortBy: 'fullName',
      sort: 'ASC',
      search: CLASS_OPERATIONS_DEMO_STUDENT_GAMMA_NAME,
    });
    const existing = students.items.find(
      (item) => item.fullName === CLASS_OPERATIONS_DEMO_STUDENT_GAMMA_NAME,
    );

    if (existing !== undefined) {
      return { studentId: existing.id, created: false };
    }

    const created = await this.studentService.createStudent({
      fullName: CLASS_OPERATIONS_DEMO_STUDENT_GAMMA_NAME,
    });

    return { studentId: created.id, created: true };
  }

  private async ensureEnrollment(
    classId: string,
    studentId: string,
  ): Promise<{ enrollmentId: string; created: boolean }> {
    try {
      const enrollment = await this.enrollmentService.enrollStudent(classId, studentId);

      return { enrollmentId: enrollment.id, created: true };
    } catch (error: unknown) {
      if (!(error instanceof StudentAlreadyEnrolledInParishYearError)) {
        throw error;
      }
    }

    const enrollment = await this.findActiveEnrollment(studentId, classId);

    return { enrollmentId: enrollment.id, created: false };
  }

  private async findSessionByTitle(
    classId: string,
    title: string,
  ): Promise<{ id: string; status: ClassSessionStatus } | null> {
    const listed = await this.classOperationsService.listSessionsByClass({
      classId,
      page: 1,
      limit: 50,
    });
    const match = listed.items.find((item) => item.title === title);

    if (match === undefined) {
      return null;
    }

    return { id: match.id, status: match.status as ClassSessionStatus };
  }

  private async ensureCompletedSession(input: {
    readonly classId: string;
    readonly actorUserId: string;
    readonly title: string;
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly marks: ReadonlyArray<{
      readonly enrollmentId: string;
      readonly status: AttendanceStatus;
      readonly note?: string;
    }>;
    readonly onCreated: () => void;
    readonly onExisting: () => void;
  }): Promise<string> {
    const existing = await this.findSessionByTitle(input.classId, input.title);

    if (existing !== null) {
      input.onExisting();

      if (existing.status === ClassSessionStatus.Completed) {
        return existing.id;
      }

      if (existing.status === ClassSessionStatus.Scheduled) {
        if (input.marks.length > 0) {
          await this.classOperationsService.bulkUpsertAttendanceFromClient(
            existing.id,
            input.marks,
            input.actorUserId,
          );
        }

        await this.classOperationsService.completeSession(existing.id, input.actorUserId);

        return existing.id;
      }

      throw new ClassOperationsDemoSeedPrerequisiteError(
        `Demo session "${input.title}" exists with unexpected status ${existing.status}.`,
      );
    }

    const created = await this.classOperationsService.createScheduledSessionForClass({
      classId: input.classId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.actorUserId,
    });

    if (input.marks.length > 0) {
      await this.classOperationsService.bulkUpsertAttendanceFromClient(
        created.id,
        input.marks,
        input.actorUserId,
      );
    }

    await this.classOperationsService.completeSession(created.id, input.actorUserId);
    input.onCreated();

    return created.id;
  }

  private async ensureCancelledSession(input: {
    readonly classId: string;
    readonly actorUserId: string;
    readonly title: string;
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly onCreated: () => void;
    readonly onExisting: () => void;
  }): Promise<string> {
    const existing = await this.findSessionByTitle(input.classId, input.title);

    if (existing !== null) {
      input.onExisting();

      if (existing.status === ClassSessionStatus.Cancelled) {
        return existing.id;
      }

      if (existing.status === ClassSessionStatus.Scheduled) {
        await this.classOperationsService.cancelSession(existing.id, input.actorUserId);

        return existing.id;
      }

      throw new ClassOperationsDemoSeedPrerequisiteError(
        `Demo cancelled session "${input.title}" exists with unexpected status ${existing.status}.`,
      );
    }

    const created = await this.classOperationsService.createScheduledSessionForClass({
      classId: input.classId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.actorUserId,
    });
    await this.classOperationsService.cancelSession(created.id, input.actorUserId);
    input.onCreated();

    return created.id;
  }

  private async ensureScheduledSession(input: {
    readonly classId: string;
    readonly actorUserId: string;
    readonly title: string;
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly onCreated: () => void;
    readonly onExisting: () => void;
  }): Promise<string> {
    const existing = await this.findSessionByTitle(input.classId, input.title);

    if (existing !== null) {
      input.onExisting();

      if (existing.status !== ClassSessionStatus.Scheduled) {
        throw new ClassOperationsDemoSeedPrerequisiteError(
          `Demo scheduled session "${input.title}" exists with unexpected status ${existing.status}.`,
        );
      }

      return existing.id;
    }

    const created = await this.classOperationsService.createScheduledSessionForClass({
      classId: input.classId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.actorUserId,
    });
    input.onCreated();

    return created.id;
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<{ id: string }> {
    const user = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (user === null) {
      throw new ClassOperationsDemoSeedPrerequisiteError(
        `Seed user ${email} not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return user;
  }
}
