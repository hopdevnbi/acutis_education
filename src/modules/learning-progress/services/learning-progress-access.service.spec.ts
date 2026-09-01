import { LearningProgressAccessDeniedError } from '../errors/learning-progress.errors';
import { LearningProgressAccessService } from './learning-progress-access.service';

describe('LearningProgressAccessService', () => {
  const studentAccessService = {
    canReadStudentByStudentEvidence: jest.fn(),
  };

  let learningProgressAccessService: LearningProgressAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    learningProgressAccessService = new LearningProgressAccessService(
      studentAccessService as never,
    );
  });

  it('allows linked parent to manage enrollment lesson progress', async () => {
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(true);

    await expect(
      learningProgressAccessService.assertCanManageEnrollmentLessonProgress(
        'parent-user-id',
        'student-id',
      ),
    ).resolves.toBeUndefined();
  });

  it('denies unrelated users from lesson progress writes', async () => {
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(false);

    await expect(
      learningProgressAccessService.assertCanManageEnrollmentLessonProgress(
        'other-user-id',
        'student-id',
      ),
    ).rejects.toBeInstanceOf(LearningProgressAccessDeniedError);
  });

  it('does not grant super-admin bypass for lesson progress writes', async () => {
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(false);

    await expect(
      learningProgressAccessService.canManageEnrollmentLessonProgress(
        'super-admin-user-id',
        'student-id',
      ),
    ).resolves.toBe(false);
  });
});
