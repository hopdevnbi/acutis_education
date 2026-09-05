import { GamificationAccessService } from './gamification-access.service';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';
import {
  CATECHIST_ROLE_CODE,
  PARENT_ROLE_CODE,
  PARISH_ADMIN_ROLE_CODE,
  STUDENT_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';

describe('GamificationAccessService - Faith Journey & Parent/Staff Reads', () => {
  let accessControlService: { getRolesForUser: jest.Mock };
  let parishScopeService: { isSuperAdmin: jest.Mock; hasActiveParishMembership: jest.Mock };
  let classService: { getClassById: jest.Mock };
  let classCatechistAssignmentService: { assertCatechistAssigned: jest.Mock };
  let enrollmentService: { getEnrollmentById: jest.Mock };
  let enrollmentQueryService: { listActiveEnrollmentsByStudentIds: jest.Mock };
  let studentGuardianService: { assertGuardianLinked: jest.Mock };
  let learnerSelfScopeService: { assertActingAsLinkedStudent: jest.Mock };
  let studentService: { listStudentIdsByLinkedUserId: jest.Mock };

  let service: GamificationAccessService;

  beforeEach(() => {
    accessControlService = { getRolesForUser: jest.fn() };
    parishScopeService = {
      isSuperAdmin: jest.fn().mockResolvedValue(false),
      hasActiveParishMembership: jest.fn().mockResolvedValue(false),
    };
    classService = { getClassById: jest.fn() };
    classCatechistAssignmentService = { assertCatechistAssigned: jest.fn() };
    enrollmentService = { getEnrollmentById: jest.fn() };
    enrollmentQueryService = { listActiveEnrollmentsByStudentIds: jest.fn() };
    studentGuardianService = { assertGuardianLinked: jest.fn() };
    learnerSelfScopeService = { assertActingAsLinkedStudent: jest.fn() };
    studentService = { listStudentIdsByLinkedUserId: jest.fn() };

    service = new GamificationAccessService(
      accessControlService as never,
      parishScopeService as never,
      classService as never,
      classCatechistAssignmentService as never,
      enrollmentService as never,
      enrollmentQueryService as never,
      studentGuardianService as never,
      learnerSelfScopeService as never,
      studentService as never,
    );
  });

  describe('assertParentCanReadStudentGamificationByEnrollment', () => {
    it('allows PARENT actor with ACTIVE guardian link to enrollment student', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: PARENT_ROLE_CODE }]);
      enrollmentService.getEnrollmentById.mockResolvedValue({
        id: 'e-1',
        studentId: 's-1',
        parishId: 'p-1',
        classId: 'c-1',
      });
      studentGuardianService.assertGuardianLinked.mockResolvedValue({
        id: 'link-1',
        studentId: 's-1',
        guardianUserId: 'u-parent',
        status: 'ACTIVE',
      });

      const result = await service.assertParentCanReadStudentGamificationByEnrollment('u-parent', 'e-1');
      expect(result.studentId).toBe('s-1');
      expect(result.enrollment.id).toBe('e-1');
      expect(studentGuardianService.assertGuardianLinked).toHaveBeenCalledWith('u-parent', 's-1');
    });

    it('denies actor if not possessing PARENT role (e.g. Catechist or Student trying parent route)', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: CATECHIST_ROLE_CODE }]);

      await expect(
        service.assertParentCanReadStudentGamificationByEnrollment('u-catechist', 'e-1'),
      ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
    });

    it('denies PARENT actor if guardian link is not active (foreign child)', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: PARENT_ROLE_CODE }]);
      enrollmentService.getEnrollmentById.mockResolvedValue({
        id: 'e-foreign',
        studentId: 's-foreign',
        parishId: 'p-1',
        classId: 'c-1',
      });
      studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('Not linked'));

      await expect(
        service.assertParentCanReadStudentGamificationByEnrollment('u-parent', 'e-foreign'),
      ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
    });
  });

  describe('assertStaffCanReadStudentGamification', () => {
    it('allows SuperAdmin globally', async () => {
      parishScopeService.isSuperAdmin.mockResolvedValue(true);

      await expect(
        service.assertStaffCanReadStudentGamification('u-super', 's-1'),
      ).resolves.toBeUndefined();
    });

    it('allows ParishAdmin with active membership in student current active enrollment parish', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: PARISH_ADMIN_ROLE_CODE }]);
      enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([
        { id: 'e-1', studentId: 's-1', classId: 'c-1', parishId: 'p-1' },
      ]);
      classService.getClassById.mockResolvedValue({ id: 'c-1', parishId: 'p-1' });
      parishScopeService.hasActiveParishMembership.mockResolvedValue(true);

      await expect(
        service.assertStaffCanReadStudentGamification('u-parish-admin', 's-1'),
      ).resolves.toBeUndefined();
    });

    it('allows Catechist with CURRENT ACTIVE assignment to student active enrollment class', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: CATECHIST_ROLE_CODE }]);
      enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([
        { id: 'e-1', studentId: 's-1', classId: 'c-assigned', parishId: 'p-1' },
      ]);
      classService.getClassById.mockResolvedValue({ id: 'c-assigned', parishId: 'p-1' });
      classCatechistAssignmentService.assertCatechistAssigned.mockResolvedValue(undefined);

      await expect(
        service.assertStaffCanReadStudentGamification('u-catechist', 's-1'),
      ).resolves.toBeUndefined();
    });

    it('denies former or unassigned Catechist when active class does not match', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: CATECHIST_ROLE_CODE }]);
      enrollmentQueryService.listActiveEnrollmentsByStudentIds.mockResolvedValue([
        { id: 'e-1', studentId: 's-1', classId: 'c-other', parishId: 'p-1' },
      ]);
      classService.getClassById.mockResolvedValue({ id: 'c-other', parishId: 'p-1' });
      classCatechistAssignmentService.assertCatechistAssigned.mockRejectedValue(new Error('Not assigned'));

      await expect(
        service.assertStaffCanReadStudentGamification('u-former-catechist', 's-1'),
      ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
    });

    it('denies Parent or Student generic staff route access', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: STUDENT_ROLE_CODE }]);

      await expect(
        service.assertStaffCanReadStudentGamification('u-student', 's-1'),
      ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
    });
  });

  describe('assertLearnerCanReadOwnGamification', () => {
    it('denies non-student (e.g. Admin or Catechist) on learner /me route', async () => {
      accessControlService.getRolesForUser.mockResolvedValue([{ code: PARISH_ADMIN_ROLE_CODE }]);

      await expect(
        service.assertLearnerCanReadOwnGamification('u-admin'),
      ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
    });
  });
});
