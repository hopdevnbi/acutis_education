import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { LearningProgressAccessDeniedError } from '../errors/learning-progress.errors';
import { LearningProgressAccessService } from './learning-progress-access.service';

describe('LearningProgressAccessService', () => {
  const parishScopeService = {
    isSuperAdmin: jest.fn(),
    hasActiveParishMembership: jest.fn(),
  };
  const studentService = {
    getStudentById: jest.fn(),
  };
  const studentGuardianService = {
    assertGuardianLinked: jest.fn(),
  };
  const classService = {
    getClassById: jest.fn(),
  };
  const classCatechistAssignmentService = {
    assertCatechistAssigned: jest.fn(),
  };

  let learningProgressAccessService: LearningProgressAccessService;

  const enrollment: EnrollmentSnapshot = {
    id: 'enrollment-id',
    studentId: 'student-id',
    classId: 'class-id',
    parishId: 'parish-id',
    academicYearId: 'year-id',
    status: 'ACTIVE' as never,
    enrolledAt: new Date('2026-09-01T00:00:00.000Z'),
    leftAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    studentService.getStudentById.mockResolvedValue({ id: 'student-id', userId: null });
    learningProgressAccessService = new LearningProgressAccessService(
      parishScopeService as never,
      studentService as never,
      studentGuardianService as never,
      classService as never,
      classCatechistAssignmentService as never,
    );
  });

  it('allows linked parent to manage lesson progress', async () => {
    studentGuardianService.assertGuardianLinked.mockResolvedValue(undefined);

    await expect(
      learningProgressAccessService.assertCanManageLessonProgress('parent-user-id', 'student-id'),
    ).resolves.toBeUndefined();
  });

  it('denies unrelated users from lesson progress writes', async () => {
    studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('denied'));

    await expect(
      learningProgressAccessService.assertCanManageLessonProgress('other-user-id', 'student-id'),
    ).rejects.toBeInstanceOf(LearningProgressAccessDeniedError);
  });

  it('does not grant super-admin bypass for lesson progress writes', async () => {
    studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('denied'));

    await expect(
      learningProgressAccessService.canManageLessonProgress('super-admin-user-id', 'student-id'),
    ).resolves.toBe(false);
  });

  it('allows linked parent to read enrollment progress', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentGuardianService.assertGuardianLinked.mockResolvedValue(undefined);

    await expect(
      learningProgressAccessService.assertCanReadEnrollmentProgress('parent-user-id', enrollment),
    ).resolves.toBeUndefined();
  });

  it('allows assigned catechist to read enrollment progress', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('denied'));
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    classCatechistAssignmentService.assertCatechistAssigned.mockResolvedValue(undefined);

    await expect(
      learningProgressAccessService.assertCanReadEnrollmentProgress(
        'catechist-user-id',
        enrollment,
      ),
    ).resolves.toBeUndefined();
  });

  it('denies parent from class progress reads', async () => {
    classService.getClassById.mockResolvedValue({ id: 'class-id', parishId: 'parish-id' });
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    classCatechistAssignmentService.assertCatechistAssigned.mockRejectedValue(new Error('denied'));

    await expect(
      learningProgressAccessService.canReadClassProgress('parent-user-id', 'class-id'),
    ).resolves.toBe(false);
  });
});
