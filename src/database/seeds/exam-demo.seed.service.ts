import { Injectable, Logger } from '@nestjs/common';
import { ClassService } from '../../modules/class/services/class.service';
import { EnrollmentStatus } from '../../modules/enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { ExamAssignmentStatus } from '../../modules/exam/enums/exam-assignment-status.enum';
import { ExamVersionStatus } from '../../modules/exam/enums/exam-version-status.enum';
import { ExamAssignmentService } from '../../modules/exam/services/exam-assignment.service';
import { ExamService } from '../../modules/exam/services/exam.service';
import { ExamVersionOrchestrationService } from '../../modules/exam/services/exam-version-orchestration.service';
import { QuestionBankService } from '../../modules/question-bank/services/question-bank.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { StudentService } from '../../modules/student/services/student.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import { CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME } from './class-enrollment.seed.constants';
import {
  EXAM_DEMO_CLASS_CODE,
  EXAM_DEMO_CODE,
  EXAM_DEMO_QUESTION_CODES,
  EXAM_DEMO_SEED_ADMIN_EMAIL,
  EXAM_DEMO_SOURCE_LOCALE,
} from './exam-demo.seed.constants';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';

export class ExamDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamDemoSeedPrerequisiteError';
  }
}

export interface ExamDemoSeedSummary {
  readonly parishId: string;
  readonly classId: string;
  readonly enrollmentId: string;
  readonly examId: string;
  readonly examVersionId: string;
  readonly examAssignmentId: string;
  readonly examCreated: boolean;
  readonly versionCreated: boolean;
  readonly versionPublished: boolean;
  readonly assignmentCreated: boolean;
  readonly assignmentWindowRefreshed: boolean;
}

@Injectable()
export class ExamDemoSeedService {
  private readonly logger = new Logger(ExamDemoSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
    private readonly questionBankService: QuestionBankService,
    private readonly examService: ExamService,
    private readonly examVersionOrchestrationService: ExamVersionOrchestrationService,
    private readonly examAssignmentService: ExamAssignmentService,
  ) {}

  async run(): Promise<ExamDemoSeedSummary> {
    const parish = await this.findDemoParish();
    const adminUser = await this.requireSeedUser(
      EXAM_DEMO_SEED_ADMIN_EMAIL,
      'npm run seed:auth-rbac',
    );
    const demoClass = await this.findDemoClass(parish.id);
    const student = await this.findDemoStudent();
    const enrollment = await this.findActiveEnrollment(student.id, demoClass.id);
    const questionIds = await this.resolveDemoQuestionIds(parish.id);

    let examCreated = false;
    let versionCreated = false;
    let versionPublished = false;
    let assignmentCreated = false;
    let assignmentWindowRefreshed = false;

    const existingExam = await this.findExistingExam(parish.id);
    const exam =
      existingExam ??
      (await (async () => {
        examCreated = true;

        return this.examService.createExam(parish.id, { code: EXAM_DEMO_CODE });
      })());

    const publishedVersion = await this.ensurePublishedVersion(exam.id, adminUser.id, questionIds, {
      onVersionCreated: () => {
        versionCreated = true;
      },
      onVersionPublished: () => {
        versionPublished = true;
      },
    });

    const assignmentResult = await this.ensureOpenAssignment(
      parish.id,
      demoClass.id,
      adminUser.id,
      publishedVersion.id,
    );
    assignmentCreated = assignmentResult.created;
    assignmentWindowRefreshed = assignmentResult.refreshed;

    this.logger.log(
      `Exam demo seed complete: exam=${exam.id}, version=${publishedVersion.id}, assignment=${assignmentResult.assignmentId}, enrollment=${enrollment.id}.`,
    );

    return {
      parishId: parish.id,
      classId: demoClass.id,
      enrollmentId: enrollment.id,
      examId: exam.id,
      examVersionId: publishedVersion.id,
      examAssignmentId: assignmentResult.assignmentId,
      examCreated,
      versionCreated,
      versionPublished,
      assignmentCreated,
      assignmentWindowRefreshed,
    };
  }

  private async ensurePublishedVersion(
    examId: string,
    adminUserId: string,
    questionIds: readonly string[],
    hooks: {
      readonly onVersionCreated: () => void;
      readonly onVersionPublished: () => void;
    },
  ): Promise<{ id: string }> {
    const versions = await this.examService.listVersionsByExam(examId, {});
    const published = versions.find((item) => item.status === ExamVersionStatus.Published);

    if (published !== undefined) {
      return published;
    }

    const draft = versions.find((item) => item.status === ExamVersionStatus.Draft);
    const draftVersion =
      draft ??
      (await (async () => {
        hooks.onVersionCreated();

        return this.examService.createExamVersion(examId, {
          title: 'Bài kiểm tra Giáo lý Demo',
          description: 'Formal exam demo seed for local verification.',
          instructions: 'Đọc kỹ câu hỏi và chọn đáp án đúng nhất.',
          sourceLocale: EXAM_DEMO_SOURCE_LOCALE,
          durationMinutes: 30,
          maxAttempts: 2,
          passingScorePercent: '70.00',
          shuffleQuestions: true,
          shuffleOptions: true,
          reviewPolicy: {
            scoreVisibility: 'AFTER_SUBMIT',
            correctAnswerVisibility: 'AFTER_SUBMIT',
            explanationVisibility: 'AFTER_SUBMIT',
          },
        });
      })());

    await this.examService.replaceVersionQuestions(draftVersion.id, {
      questionIds: [...questionIds],
    });

    const publishedVersion = await this.examVersionOrchestrationService.publishVersion(
      draftVersion.id,
      adminUserId,
    );
    hooks.onVersionPublished();

    return publishedVersion;
  }

  private async ensureOpenAssignment(
    parishId: string,
    classId: string,
    adminUserId: string,
    examVersionId: string,
  ): Promise<{ assignmentId: string; created: boolean; refreshed: boolean }> {
    const assignments = await this.examAssignmentService.listAssignmentsByClass(parishId, classId, {
      page: 1,
      limit: 50,
      sortBy: 'opensAt',
      sort: 'DESC',
    });
    const existing = assignments.items.find((item) => item.examVersionId === examVersionId);
    const now = new Date();
    const opensAt = new Date(now.getTime() - 60 * 60 * 1000);
    const closesAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (existing === undefined) {
      const created = await this.examAssignmentService.createAssignment(
        parishId,
        classId,
        adminUserId,
        {
          examVersionId,
          opensAt,
          closesAt,
        },
      );

      return {
        assignmentId: created.id,
        created: true,
        refreshed: false,
      };
    }

    if (
      existing.closesAt.getTime() <= now.getTime() ||
      existing.opensAt.getTime() > now.getTime()
    ) {
      const refreshed = await this.examAssignmentService.updateAssignment(existing.id, {
        opensAt,
        closesAt,
        status: ExamAssignmentStatus.Open,
      });

      return {
        assignmentId: refreshed.id,
        created: false,
        refreshed: true,
      };
    }

    return {
      assignmentId: existing.id,
      created: false,
      refreshed: false,
    };
  }

  private async resolveDemoQuestionIds(parishId: string): Promise<string[]> {
    const questionIds: string[] = [];

    for (const code of EXAM_DEMO_QUESTION_CODES) {
      const result = await this.questionBankService.listQuestionsByParish(parishId, {
        page: 1,
        limit: 5,
        sortBy: 'code',
        sort: 'ASC',
        search: code,
      });
      const question = result.items.find((item) => item.code === code);

      if (question === undefined || question.currentPublishedVersionId === null) {
        throw new ExamDemoSeedPrerequisiteError(
          `Published demo question "${code}" not found. Run npm run seed:question-bank-demo first.`,
        );
      }

      questionIds.push(question.id);
    }

    return questionIds;
  }

  private async findExistingExam(parishId: string): Promise<{ id: string } | undefined> {
    const exams = await this.examService.listExamsByParish(parishId, {
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: EXAM_DEMO_CODE,
    });

    return exams.items.find((item) => item.code === EXAM_DEMO_CODE);
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
      throw new ExamDemoSeedPrerequisiteError(
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
      search: EXAM_DEMO_CLASS_CODE,
    });
    const demoClass = classes.items.find((item) => item.code === EXAM_DEMO_CLASS_CODE);

    if (demoClass === undefined) {
      throw new ExamDemoSeedPrerequisiteError(
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
      throw new ExamDemoSeedPrerequisiteError(
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
      throw new ExamDemoSeedPrerequisiteError(
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
      throw new ExamDemoSeedPrerequisiteError(
        `Seed user ${email} not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return account;
  }
}
