import { Injectable, Logger } from '@nestjs/common';
import { ClassService } from '../../modules/class/services/class.service';
import { CurriculumService } from '../../modules/curriculum/services/curriculum.service';
import { EnrollmentStatus } from '../../modules/enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { LessonProgressStatus } from '../../modules/learning-progress/enums/lesson-progress-status.enum';
import { LearningProgressService } from '../../modules/learning-progress/services/learning-progress.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { StudentService } from '../../modules/student/services/student.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from './class-enrollment.seed.constants';
import { CURRICULUM_DEMO_CURRICULUM_CODE } from './curriculum-demo.seed.constants';
import {
  LEARNING_PROGRESS_DEMO_LESSON_COMPLETED_CODE,
  LEARNING_PROGRESS_DEMO_LESSON_IN_PROGRESS_CODE,
} from './learning-progress-demo.seed.constants';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';

export class LearningProgressDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningProgressDemoSeedPrerequisiteError';
  }
}

export interface LearningProgressDemoSeedSummary {
  enrollmentId: string;
  classId: string;
  curriculumId: string;
  inProgressLessonKey: string;
  completedLessonKey: string;
  inProgressWritten: boolean;
  completedWritten: boolean;
  aggregateLessonsAssigned: number;
  aggregateLessonsStarted: number;
  aggregateLessonsCompleted: number;
}

@Injectable()
export class LearningProgressDemoSeedService {
  private readonly logger = new Logger(LearningProgressDemoSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
    private readonly curriculumService: CurriculumService,
    private readonly learningProgressService: LearningProgressService,
  ) {}

  async run(): Promise<LearningProgressDemoSeedSummary> {
    const parish = await this.findDemoParish();
    const parentUser = await this.requireSeedUser(
      CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
      'npm run seed:auth-rbac',
    );
    const demoClass = await this.findDemoClass(parish.id);
    const student = await this.findDemoStudent();
    const enrollment = await this.findActiveEnrollment(student.id, demoClass.id);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      demoClass.parishId,
      demoClass.academicYearId,
      demoClass.catechismLevelId,
    );
    const tree = await this.curriculumService.getVersionTree(assignedVersion.id);
    const inProgressLessonKey = this.findCanonicalLessonKeyByCode(
      tree.topics,
      LEARNING_PROGRESS_DEMO_LESSON_IN_PROGRESS_CODE,
    );
    const completedLessonKey = this.findCanonicalLessonKeyByCode(
      tree.topics,
      LEARNING_PROGRESS_DEMO_LESSON_COMPLETED_CODE,
    );

    const inProgressSnapshot = await this.learningProgressService.patchLessonProgress({
      enrollmentId: enrollment.id,
      canonicalLessonKey: inProgressLessonKey,
      status: LessonProgressStatus.InProgress,
      actorUserId: parentUser.id,
    });
    const completedSnapshot = await this.learningProgressService.patchLessonProgress({
      enrollmentId: enrollment.id,
      canonicalLessonKey: completedLessonKey,
      status: LessonProgressStatus.Completed,
      actorUserId: parentUser.id,
    });

    const aggregate = await this.learningProgressService.getEnrollmentLearningProgress({
      enrollmentId: enrollment.id,
      actorUserId: parentUser.id,
    });

    this.logger.log(
      `Learning progress demo seed complete for enrollment ${enrollment.id}: IN_PROGRESS=${inProgressSnapshot.canonicalLessonKey}, COMPLETED=${completedSnapshot.canonicalLessonKey}.`,
    );

    return {
      enrollmentId: enrollment.id,
      classId: demoClass.id,
      curriculumId: assignedVersion.curriculumId,
      inProgressLessonKey,
      completedLessonKey,
      inProgressWritten: inProgressSnapshot.status === LessonProgressStatus.InProgress,
      completedWritten: completedSnapshot.status === LessonProgressStatus.Completed,
      aggregateLessonsAssigned: aggregate.learning.lessonsAssigned,
      aggregateLessonsStarted: aggregate.learning.lessonsStarted,
      aggregateLessonsCompleted: aggregate.learning.lessonsCompleted,
    };
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
      throw new LearningProgressDemoSeedPrerequisiteError(
        'Demo parish not found. Run npm run seed:parish-academic first.',
      );
    }

    return parish;
  }

  private async findDemoClass(parishId: string): Promise<{
    id: string;
    parishId: string;
    academicYearId: string;
    catechismLevelId: string;
  }> {
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
      throw new LearningProgressDemoSeedPrerequisiteError(
        'Demo class not found. Run npm run seed:class-enrollment first.',
      );
    }

    return demoClass;
  }

  private async findDemoStudent(): Promise<{ id: string }> {
    const students = await this.studentService.listStudents({
      page: 1,
      limit: 5,
      sortBy: 'fullName',
      sort: 'ASC',
      search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    });
    const student = students.items.find(
      (item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
    );

    if (student === undefined) {
      throw new LearningProgressDemoSeedPrerequisiteError(
        'Demo student alpha not found. Run npm run seed:class-enrollment first.',
      );
    }

    return student;
  }

  private async findActiveEnrollment(studentId: string, classId: string): Promise<{ id: string }> {
    const enrollments = await this.enrollmentService.listEnrollmentsByStudent(studentId, {
      page: 1,
      limit: 10,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    const enrollment = enrollments.items.find(
      (item) => item.classId === classId && item.status === EnrollmentStatus.Active,
    );

    if (enrollment === undefined) {
      throw new LearningProgressDemoSeedPrerequisiteError(
        'Active demo enrollment not found. Run npm run seed:class-enrollment first.',
      );
    }

    return enrollment;
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<{ id: string }> {
    const account = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (account === null) {
      throw new LearningProgressDemoSeedPrerequisiteError(
        `Seed user ${email} not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return account;
  }

  private findCanonicalLessonKeyByCode(
    topics: ReadonlyArray<{
      lessons: ReadonlyArray<{ code: string | null; canonicalLessonKey: string }>;
    }>,
    lessonCode: string,
  ): string {
    for (const topic of topics) {
      for (const lesson of topic.lessons) {
        if (lesson.code === lessonCode) {
          return lesson.canonicalLessonKey;
        }
      }
    }

    throw new LearningProgressDemoSeedPrerequisiteError(
      `Lesson code ${lessonCode} not found in assigned curriculum ${CURRICULUM_DEMO_CURRICULUM_CODE}. Run npm run seed:curriculum-demo first.`,
    );
  }
}
