import { Test, type TestingModule } from '@nestjs/testing';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { ClassService } from '../../class/services/class.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ExamService } from '../../exam/services/exam.service';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service';
import { StudentStatus } from '../../student/enums/student-status.enum';
import { StudentService } from '../../student/services/student.service';
import { CatechistPortalService } from './catechist-portal.service';
import { FamilyPortalAccessService } from './family-portal-access.service';

describe('CatechistPortalService', () => {
  let catechistPortalService: CatechistPortalService;
  let familyPortalAccessService: jest.Mocked<
    Pick<FamilyPortalAccessService, 'assertCatechistActor' | 'assertCatechistAssignedToClass'>
  >;
  let classCatechistAssignmentService: jest.Mocked<
    Pick<ClassCatechistAssignmentService, 'listAssignedClassIds'>
  >;
  let classService: jest.Mocked<Pick<ClassService, 'getClassSnapshotsByIds'>>;
  let enrollmentQueryService: jest.Mocked<
    Pick<EnrollmentQueryService, 'countActiveEnrollmentsByClassIds' | 'getEnrollmentSnapshotsByIds'>
  >;
  let learningProgressService: jest.Mocked<
    Pick<LearningProgressService, 'getClassLearningProgress'>
  >;
  let examService: jest.Mocked<Pick<ExamService, 'getEnrollmentExamSummariesByEnrollmentIds'>>;
  let studentService: jest.Mocked<Pick<StudentService, 'getStudentSnapshotsByIds'>>;

  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const classId = '22222222-2222-4222-8222-222222222222';
  const enrollmentId = '33333333-3333-4333-8333-333333333333';
  const studentId = '44444444-4444-4444-8444-444444444444';
  const parishId = '55555555-5555-4555-8555-555555555555';

  beforeEach(async () => {
    familyPortalAccessService = {
      assertCatechistActor: jest.fn(),
      assertCatechistAssignedToClass: jest.fn(),
    };
    classCatechistAssignmentService = {
      listAssignedClassIds: jest.fn(),
    };
    classService = {
      getClassSnapshotsByIds: jest.fn(),
    };
    enrollmentQueryService = {
      countActiveEnrollmentsByClassIds: jest.fn(),
      getEnrollmentSnapshotsByIds: jest.fn(),
    };
    learningProgressService = {
      getClassLearningProgress: jest.fn(),
    };
    examService = {
      getEnrollmentExamSummariesByEnrollmentIds: jest.fn(),
    };
    studentService = {
      getStudentSnapshotsByIds: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CatechistPortalService,
        { provide: FamilyPortalAccessService, useValue: familyPortalAccessService },
        {
          provide: ClassCatechistAssignmentService,
          useValue: classCatechistAssignmentService,
        },
        { provide: ClassService, useValue: classService },
        { provide: EnrollmentQueryService, useValue: enrollmentQueryService },
        { provide: LearningProgressService, useValue: learningProgressService },
        { provide: ExamService, useValue: examService },
        { provide: StudentService, useValue: studentService },
      ],
    }).compile();

    catechistPortalService = moduleRef.get(CatechistPortalService);
  });

  it('returns empty context for catechists without assignments', async () => {
    classCatechistAssignmentService.listAssignedClassIds.mockResolvedValue([]);

    const snapshot = await catechistPortalService.getContext(actorUserId);

    expect(snapshot).toEqual({
      actorUserId,
      assignedClassCount: 0,
      parishIds: [],
    });
    expect(familyPortalAccessService.assertCatechistActor).toHaveBeenCalledWith(actorUserId);
    expect(classService.getClassSnapshotsByIds).not.toHaveBeenCalled();
  });

  it('lists paginated assigned class summaries', async () => {
    classCatechistAssignmentService.listAssignedClassIds.mockResolvedValue([classId]);
    classService.getClassSnapshotsByIds.mockResolvedValue([
      {
        id: classId,
        parishId,
        academicYearId: '66666666-6666-4666-8666-666666666666',
        catechismLevelId: '77777777-7777-4777-8777-777777777777',
        code: 'class-a',
        name: 'Class A',
        status: ClassStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    enrollmentQueryService.countActiveEnrollmentsByClassIds.mockResolvedValue(
      new Map([[classId, 3]]),
    );

    const snapshot = await catechistPortalService.listClasses({
      actorUserId,
      page: 1,
      limit: 20,
    });

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]?.activeEnrollmentCount).toBe(3);
    expect(snapshot.total).toBe(1);
  });

  it('composes roster rows with exam and enrollment status', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    learningProgressService.getClassLearningProgress.mockResolvedValue({
      classId,
      filters: { curriculumId: null, canonicalLessonKey: null },
      summary: {
        learnersTotal: 1,
        learnersWithLearningActivity: 1,
        lessonAssignmentsTotal: 1,
        lessonsStarted: 1,
        lessonsCompleted: 0,
        completionRatio: 0,
        practice: {
          standard: {
            sessionsCompleted: 0,
            questionsAttempted: 0,
            firstAttemptCorrect: 0,
            finalCorrect: 0,
            firstAttemptAccuracy: 0,
            finalAccuracy: 0,
          },
          review: {
            sessionsCompleted: 0,
            questionsAttempted: 0,
            finalCorrect: 0,
            finalAccuracy: 0,
            uniqueQuestionVersionsReviewed: 0,
          },
          lastPracticedAt: null,
        },
        lastLearningActivityAt: now,
      },
      learners: {
        items: [
          {
            enrollmentId,
            studentId,
            learning: {
              lessonsAssigned: 1,
              lessonsStarted: 1,
              lessonsCompleted: 0,
              completionRatio: 0,
            },
            practice: {
              standard: {
                sessionsCompleted: 0,
                questionsAttempted: 0,
                firstAttemptCorrect: 0,
                finalCorrect: 0,
                firstAttemptAccuracy: 0,
                finalAccuracy: 0,
              },
              review: {
                sessionsCompleted: 0,
                questionsAttempted: 0,
                finalCorrect: 0,
                finalAccuracy: 0,
                uniqueQuestionVersionsReviewed: 0,
              },
              lastPracticedAt: null,
            },
            lastLearningActivityAt: now,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    examService.getEnrollmentExamSummariesByEnrollmentIds.mockResolvedValue(
      new Map([
        [
          enrollmentId,
          {
            assignmentsAvailable: 2,
            attemptsCompleted: 1,
            latestScorePercent: '85.00',
          },
        ],
      ]),
    );
    studentService.getStudentSnapshotsByIds.mockResolvedValue([
      {
        id: studentId,
        userId: null,
        fullName: 'Demo Student',
        status: StudentStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    enrollmentQueryService.getEnrollmentSnapshotsByIds.mockResolvedValue([
      {
        id: enrollmentId,
        studentId,
        classId,
        parishId,
        academicYearId: '66666666-6666-4666-8666-666666666666',
        status: EnrollmentStatus.Active,
        enrolledAt: now,
        leftAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const snapshot = await catechistPortalService.getClassRoster({
      actorUserId,
      classId,
    });

    expect(snapshot.learners.items).toHaveLength(1);
    expect(snapshot.learners.items[0]).toMatchObject({
      displayName: 'Demo Student',
      enrollmentStatus: EnrollmentStatus.Active,
      exam: {
        assignmentsAvailable: 2,
        attemptsCompleted: 1,
        latestScorePercent: '85.00',
      },
    });
  });

  it('uses bounded batch queries for roster page composition', async () => {
    learningProgressService.getClassLearningProgress.mockResolvedValue({
      classId,
      filters: { curriculumId: null, canonicalLessonKey: null },
      summary: {
        learnersTotal: 0,
        learnersWithLearningActivity: 0,
        lessonAssignmentsTotal: 0,
        lessonsStarted: 0,
        lessonsCompleted: 0,
        completionRatio: 0,
        practice: {
          standard: {
            sessionsCompleted: 0,
            questionsAttempted: 0,
            firstAttemptCorrect: 0,
            finalCorrect: 0,
            firstAttemptAccuracy: 0,
            finalAccuracy: 0,
          },
          review: {
            sessionsCompleted: 0,
            questionsAttempted: 0,
            finalCorrect: 0,
            finalAccuracy: 0,
            uniqueQuestionVersionsReviewed: 0,
          },
          lastPracticedAt: null,
        },
        lastLearningActivityAt: null,
      },
      learners: {
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
    examService.getEnrollmentExamSummariesByEnrollmentIds.mockResolvedValue(new Map());
    studentService.getStudentSnapshotsByIds.mockResolvedValue([]);
    enrollmentQueryService.getEnrollmentSnapshotsByIds.mockResolvedValue([]);

    await catechistPortalService.getClassRoster({
      actorUserId,
      classId,
    });

    expect(learningProgressService.getClassLearningProgress).toHaveBeenCalledTimes(1);
    expect(examService.getEnrollmentExamSummariesByEnrollmentIds).toHaveBeenCalledTimes(1);
    expect(studentService.getStudentSnapshotsByIds).toHaveBeenCalledTimes(1);
    expect(enrollmentQueryService.getEnrollmentSnapshotsByIds).toHaveBeenCalledTimes(1);
  });
});
