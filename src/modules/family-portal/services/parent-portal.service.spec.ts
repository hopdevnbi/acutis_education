import { Test, type TestingModule } from '@nestjs/testing';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service';
import { StudentStatus } from '../../student/enums/student-status.enum';
import { StudentService } from '../../student/services/student.service';
import { FamilyPortalAccessService } from './family-portal-access.service';
import { ParentPortalService } from './parent-portal.service';

describe('ParentPortalService', () => {
  let parentPortalService: ParentPortalService;
  let familyPortalAccessService: jest.Mocked<
    Pick<FamilyPortalAccessService, 'assertParentActor' | 'assertGuardianLinkedToStudent'>
  >;
  let enrollmentQueryService: jest.Mocked<
    Pick<EnrollmentQueryService, 'listStudentIdsForGuardian' | 'listActiveEnrollmentsByStudentIds'>
  >;
  let enrollmentService: jest.Mocked<Pick<EnrollmentService, 'getEnrollmentById'>>;
  let studentService: jest.Mocked<Pick<StudentService, 'getStudentSnapshotsByIds'>>;
  let classService: jest.Mocked<Pick<ClassService, 'getClassSnapshotsByIds'>>;
  let learningProgressService: jest.Mocked<
    Pick<LearningProgressService, 'getEnrollmentLearningProgress' | 'getClassLearningProgress'>
  >;

  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const studentId = '22222222-2222-4222-8222-222222222222';
  const enrollmentId = '33333333-3333-4333-8333-333333333333';
  const classId = '44444444-4444-4444-8444-444444444444';
  const parishId = '55555555-5555-4555-8555-555555555555';

  beforeEach(async () => {
    familyPortalAccessService = {
      assertParentActor: jest.fn(),
      assertGuardianLinkedToStudent: jest.fn(),
    };
    enrollmentQueryService = {
      listStudentIdsForGuardian: jest.fn(),
      listActiveEnrollmentsByStudentIds: jest.fn(),
    };
    enrollmentService = {
      getEnrollmentById: jest.fn(),
    };
    studentService = {
      getStudentSnapshotsByIds: jest.fn(),
    };
    classService = {
      getClassSnapshotsByIds: jest.fn(),
    };
    learningProgressService = {
      getEnrollmentLearningProgress: jest.fn(),
      getClassLearningProgress: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ParentPortalService,
        { provide: FamilyPortalAccessService, useValue: familyPortalAccessService },
        { provide: EnrollmentQueryService, useValue: enrollmentQueryService },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: StudentService, useValue: studentService },
        { provide: ClassService, useValue: classService },
        { provide: LearningProgressService, useValue: learningProgressService },
      ],
    }).compile();

    parentPortalService = moduleRef.get(ParentPortalService);
  });

  it('returns empty parent context when no linked children exist', async () => {
    enrollmentQueryService.listStudentIdsForGuardian.mockResolvedValue([]);

    const snapshot = await parentPortalService.getContext(actorUserId);

    expect(snapshot).toEqual({
      actorUserId,
      linkedChildCount: 0,
      activeEnrollmentCount: 0,
    });
  });

  it('lists linked children with active enrollments and class metadata', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    enrollmentQueryService.listStudentIdsForGuardian.mockResolvedValue([studentId]);
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
    enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([
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
    classService.getClassSnapshotsByIds.mockResolvedValue([
      {
        id: classId,
        parishId,
        academicYearId: '66666666-6666-4666-8666-666666666666',
        catechismLevelId: '77777777-7777-4777-8777-777777777777',
        code: 'class-a',
        name: 'Class A',
        status: ClassStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const snapshot = await parentPortalService.listChildren(actorUserId);

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      displayName: 'Demo Student',
      activeEnrollments: [
        {
          enrollmentId,
          className: 'Class A',
        },
      ],
    });
  });

  it('sorts children and each child active enrollment deterministically', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const secondStudentId = '22222222-2222-4222-8222-222222222221';
    const secondEnrollmentId = '33333333-3333-4333-8333-333333333332';
    const secondClassId = '44444444-4444-4444-8444-444444444443';
    const academicYearId = '66666666-6666-4666-8666-666666666666';
    const catechismLevelId = '77777777-7777-4777-8777-777777777777';

    enrollmentQueryService.listStudentIdsForGuardian.mockResolvedValue([
      studentId,
      secondStudentId,
    ]);
    studentService.getStudentSnapshotsByIds.mockResolvedValue([
      {
        id: studentId,
        userId: null,
        fullName: 'Beta Child',
        status: StudentStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: secondStudentId,
        userId: null,
        fullName: 'Alpha Child',
        status: StudentStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([
      {
        id: enrollmentId,
        studentId,
        classId,
        parishId,
        academicYearId,
        status: EnrollmentStatus.Active,
        enrolledAt: now,
        leftAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: secondEnrollmentId,
        studentId,
        classId: secondClassId,
        parishId,
        academicYearId,
        status: EnrollmentStatus.Active,
        enrolledAt: now,
        leftAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    classService.getClassSnapshotsByIds.mockResolvedValue([
      {
        id: classId,
        parishId,
        academicYearId,
        catechismLevelId,
        code: 'z-class',
        name: 'Z Class',
        status: ClassStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: secondClassId,
        parishId,
        academicYearId,
        catechismLevelId,
        code: 'a-class',
        name: 'A Class',
        status: ClassStatus.Active,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const snapshot = await parentPortalService.listChildren(actorUserId);

    expect(snapshot.items.map((child) => child.displayName)).toEqual(['Alpha Child', 'Beta Child']);
    expect(snapshot.items[1]?.activeEnrollments.map((enrollment) => enrollment.className)).toEqual([
      'A Class',
      'Z Class',
    ]);
  });

  it('uses bounded batch queries for children list composition', async () => {
    enrollmentQueryService.listStudentIdsForGuardian.mockResolvedValue([studentId]);
    studentService.getStudentSnapshotsByIds.mockResolvedValue([]);
    enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([]);
    classService.getClassSnapshotsByIds.mockResolvedValue([]);

    await parentPortalService.listChildren(actorUserId);

    expect(enrollmentQueryService.listStudentIdsForGuardian).toHaveBeenCalledTimes(1);
    expect(enrollmentQueryService.listActiveEnrollmentsByStudentIds).toHaveBeenCalledTimes(1);
    expect(studentService.getStudentSnapshotsByIds).toHaveBeenCalledTimes(1);
    expect(classService.getClassSnapshotsByIds).toHaveBeenCalledTimes(1);
    expect(learningProgressService.getClassLearningProgress).not.toHaveBeenCalled();
  });

  it('delegates enrollment progress to learning progress after guardian scope check', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    enrollmentService.getEnrollmentById.mockResolvedValue({
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
    });
    learningProgressService.getEnrollmentLearningProgress.mockResolvedValue({
      enrollmentId,
      filters: { curriculumId: null, canonicalLessonKey: null },
      learning: {
        curriculumId: '88888888-8888-4888-8888-888888888888',
        assignedCurriculumVersionId: '99999999-9999-4999-8999-999999999999',
        lessonsAssigned: 1,
        lessonsStarted: 0,
        lessonsCompleted: 0,
        completionRatio: 0,
      },
      lessons: [],
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
      exam: {
        assignmentsAvailable: 0,
        attemptsCompleted: 0,
        latestScorePercent: null,
      },
      lastLearningActivityAt: null,
    });

    const snapshot = await parentPortalService.getEnrollmentProgress({
      actorUserId,
      enrollmentId,
    });

    expect(familyPortalAccessService.assertGuardianLinkedToStudent).toHaveBeenCalledWith(
      actorUserId,
      studentId,
    );
    expect(snapshot.enrollmentId).toBe(enrollmentId);
    expect(snapshot.progress.enrollmentId).toBe(enrollmentId);
  });
});
