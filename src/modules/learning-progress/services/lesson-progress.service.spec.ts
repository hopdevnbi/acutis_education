import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { CanonicalLessonKeyNotInCurriculumError } from '../../curriculum/errors/curriculum.errors';
import {
  LessonProgressPersistedStatus,
  LessonProgressStatus,
} from '../enums/lesson-progress-status.enum';
import {
  LearningProgressAccessDeniedError,
  LearningProgressCanonicalLessonInvalidError,
  LearningProgressEnrollmentNotWritableError,
} from '../errors/learning-progress.errors';
import { LessonProgressService } from './lesson-progress.service';

describe('LessonProgressService', () => {
  const lessonProgressRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };
  const enrollmentService = {
    getEnrollmentById: jest.fn(),
  };
  const classService = {
    getClassById: jest.fn(),
  };
  const curriculumService = {
    getPublishedVersionForAssignment: jest.fn(),
    assertCanonicalLessonKeyBelongsToVersion: jest.fn(),
  };
  const learningProgressAccessService = {
    assertCanManageLessonProgress: jest.fn(),
  };

  let lessonProgressService: LessonProgressService;

  const enrollment = {
    id: 'enrollment-id',
    studentId: 'student-id',
    classId: 'class-id',
    parishId: 'parish-id',
    academicYearId: 'year-id',
    status: EnrollmentStatus.Active,
    enrolledAt: new Date(),
    leftAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const context = {
    enrollmentId: enrollment.id,
    curriculumId: 'curriculum-id',
    assignedCurriculumVersionId: 'version-id',
    canonicalLessonKey: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lessonProgressService = new LessonProgressService(
      lessonProgressRepository as never,
      dataSource as never,
      enrollmentService as never,
      classService as never,
      curriculumService as never,
      learningProgressAccessService as never,
    );

    enrollmentService.getEnrollmentById.mockResolvedValue(enrollment);
    classService.getClassById.mockResolvedValue({
      id: enrollment.classId,
      parishId: enrollment.parishId,
      academicYearId: enrollment.academicYearId,
      catechismLevelId: 'level-id',
    });
    curriculumService.getPublishedVersionForAssignment.mockResolvedValue({
      id: context.assignedCurriculumVersionId,
      curriculumId: context.curriculumId,
    });
    curriculumService.assertCanonicalLessonKeyBelongsToVersion.mockResolvedValue(undefined);
    learningProgressAccessService.assertCanManageLessonProgress.mockResolvedValue(undefined);
  });

  it('returns NOT_STARTED when no row exists', async () => {
    lessonProgressRepository.findOne.mockResolvedValue(null);

    const snapshot = await lessonProgressService.getLessonProgress({
      enrollmentId: enrollment.id,
      canonicalLessonKey: context.canonicalLessonKey,
    });

    expect(snapshot.status).toBe(LessonProgressStatus.NotStarted);
    expect(snapshot.startedAt).toBeNull();
    expect(snapshot.curriculumId).toBe(context.curriculumId);
  });

  it('denies writes for inactive enrollment', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      ...enrollment,
      status: EnrollmentStatus.Transferred,
    });

    await expect(
      lessonProgressService.setLessonProgress({
        enrollmentId: enrollment.id,
        canonicalLessonKey: context.canonicalLessonKey,
        targetStatus: LessonProgressStatus.InProgress,
        actorUserId: 'parent-user-id',
      }),
    ).rejects.toBeInstanceOf(LearningProgressEnrollmentNotWritableError);
  });

  it('maps invalid canonical lesson keys to learning progress errors', async () => {
    curriculumService.assertCanonicalLessonKeyBelongsToVersion.mockRejectedValue(
      new CanonicalLessonKeyNotInCurriculumError(),
    );

    await expect(
      lessonProgressService.getLessonProgress({
        enrollmentId: enrollment.id,
        canonicalLessonKey: context.canonicalLessonKey,
      }),
    ).rejects.toBeInstanceOf(LearningProgressCanonicalLessonInvalidError);
  });

  it('creates IN_PROGRESS row on first write', async () => {
    const managerRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((row: Record<string, unknown>) => ({
        id: 'progress-id',
        ...row,
      })),
    };

    dataSource.transaction.mockImplementation((callback: (manager: unknown) => unknown) =>
      callback({
        getRepository: () => managerRepository,
      }),
    );

    const snapshot = await lessonProgressService.setLessonProgress({
      enrollmentId: enrollment.id,
      canonicalLessonKey: context.canonicalLessonKey,
      targetStatus: LessonProgressStatus.InProgress,
      actorUserId: 'parent-user-id',
    });

    expect(snapshot.status).toBe(LessonProgressStatus.InProgress);
    expect(managerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LessonProgressPersistedStatus.InProgress,
        assignedCurriculumVersionId: context.assignedCurriculumVersionId,
        completedAt: null,
      }),
    );
  });

  it('preserves timestamps on idempotent COMPLETED replay', async () => {
    const existingRow = {
      id: 'progress-id',
      enrollmentId: enrollment.id,
      curriculumId: context.curriculumId,
      canonicalLessonKey: context.canonicalLessonKey,
      assignedCurriculumVersionId: context.assignedCurriculumVersionId,
      status: LessonProgressPersistedStatus.Completed,
      startedAt: new Date('2026-08-01T10:00:00.000Z'),
      completedAt: new Date('2026-08-01T11:00:00.000Z'),
      startedByUserId: 'parent-user-id',
      completedByUserId: 'parent-user-id',
    };
    const managerRepository = {
      findOne: jest.fn().mockResolvedValue(existingRow),
      save: jest.fn(),
    };

    dataSource.transaction.mockImplementation((callback: (manager: unknown) => unknown) =>
      callback({
        getRepository: () => managerRepository,
      }),
    );

    const snapshot = await lessonProgressService.setLessonProgress({
      enrollmentId: enrollment.id,
      canonicalLessonKey: context.canonicalLessonKey,
      targetStatus: LessonProgressStatus.Completed,
      actorUserId: 'parent-user-id',
    });

    expect(snapshot.status).toBe(LessonProgressStatus.Completed);
    expect(managerRepository.save).not.toHaveBeenCalled();
  });

  it('denies unrelated actor writes', async () => {
    learningProgressAccessService.assertCanManageLessonProgress.mockRejectedValue(
      new LearningProgressAccessDeniedError(),
    );

    await expect(
      lessonProgressService.setLessonProgress({
        enrollmentId: enrollment.id,
        canonicalLessonKey: context.canonicalLessonKey,
        targetStatus: LessonProgressStatus.InProgress,
        actorUserId: 'other-user-id',
      }),
    ).rejects.toBeInstanceOf(LearningProgressAccessDeniedError);
  });
});
