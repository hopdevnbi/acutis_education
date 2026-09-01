import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import {
  PracticeAccessDeniedError,
  PracticeClassProgressAccessDeniedError,
} from '../errors/practice.errors';
import { PracticeAccessService } from './practice-access.service';

describe('PracticeAccessService', () => {
  const parishScopeService = {
    isSuperAdmin: jest.fn(),
    hasActiveParishMembership: jest.fn(),
  };
  const studentAccessService = {
    canReadStudentByStudentEvidence: jest.fn(),
  };
  const classService = {
    getClassById: jest.fn(),
  };
  const classCatechistAssignmentService = {
    assertCatechistAssigned: jest.fn(),
  };

  let practiceAccessService: PracticeAccessService;

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

  beforeEach(() => {
    jest.clearAllMocks();
    practiceAccessService = new PracticeAccessService(
      parishScopeService as never,
      studentAccessService as never,
      classService as never,
      classCatechistAssignmentService as never,
    );
    classService.getClassById.mockResolvedValue({ id: 'class-id', parishId: 'parish-id' });
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

  it('allows assigned catechist to read enrollment progress', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(false);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    classCatechistAssignmentService.assertCatechistAssigned.mockResolvedValue({});

    await expect(
      practiceAccessService.assertCanReadEnrollmentProgress('catechist-id', enrollment),
    ).resolves.toBeUndefined();
  });

  it('allows parish admin to read enrollment progress', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    studentAccessService.canReadStudentByStudentEvidence.mockResolvedValue(false);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(true);

    await expect(
      practiceAccessService.assertCanReadEnrollmentProgress('admin-id', enrollment),
    ).resolves.toBeUndefined();
  });

  it('denies parent from class progress even when linked to a learner', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    classCatechistAssignmentService.assertCatechistAssigned.mockRejectedValue(new Error('denied'));

    await expect(
      practiceAccessService.assertCanReadClassProgress('parent-id', 'class-id'),
    ).rejects.toBeInstanceOf(PracticeClassProgressAccessDeniedError);
  });

  it('allows assigned catechist to read class progress', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    classCatechistAssignmentService.assertCatechistAssigned.mockResolvedValue({});

    await expect(
      practiceAccessService.assertCanReadClassProgress('catechist-id', 'class-id'),
    ).resolves.toBeUndefined();
  });
});
