import { PracticeAccessDeniedError } from '../errors/practice.errors';
import { PracticeAccessService } from './practice-access.service';

describe('PracticeAccessService', () => {
  const parishScopeService = {
    isSuperAdmin: jest.fn(),
  };
  const studentAccessService = {
    canReadStudentByStudentEvidence: jest.fn(),
  };

  let practiceAccessService: PracticeAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    practiceAccessService = new PracticeAccessService(
      parishScopeService as never,
      studentAccessService as never,
    );
  });

  it('allows super admin to manage enrollment practice', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(true);

    await expect(
      practiceAccessService.assertCanManageEnrollmentPractice('user-id', 'student-id'),
    ).resolves.toBeUndefined();
  });

  it('allows guardian-linked parent to manage enrollment practice', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(true);

    await expect(
      practiceAccessService.assertCanManageEnrollmentPractice('user-id', 'student-id'),
    ).resolves.toBeUndefined();
  });

  it('denies unrelated users from learner session access', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(false);

    await expect(
      practiceAccessService.assertCanReadLearnerSession('user-id', 'student-id'),
    ).rejects.toBeInstanceOf(PracticeAccessDeniedError);
  });
});
