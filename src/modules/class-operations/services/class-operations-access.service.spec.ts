import { ClassOperationsAccessDeniedError } from '../errors/class-operations.errors';
import { ClassOperationsAccessService } from './class-operations-access.service';

describe('ClassOperationsAccessService staff scope', () => {
  const assertCatechistAssigned = jest.fn();
  const parishScopeService = {
    isSuperAdmin: jest.fn(),
    hasActiveParishMembership: jest.fn(),
  };
  const accessControlService = {
    getRolesForUser: jest.fn(),
  };
  const classService = {
    getClassById: jest.fn(),
  };
  const classCatechistAssignmentService = {
    assertCatechistAssigned,
  };
  const classSessionService = {
    getSessionById: jest.fn(),
  };
  const enrollmentService = {
    getEnrollmentById: jest.fn(),
  };
  const studentGuardianService = {
    assertGuardianLinked: jest.fn(),
  };
  const learnerSelfScopeService = {
    assertActingAsLinkedStudent: jest.fn(),
  };

  const service = new ClassOperationsAccessService(
    accessControlService as never,
    parishScopeService as never,
    classService as never,
    classCatechistAssignmentService as never,
    enrollmentService as never,
    studentGuardianService as never,
    learnerSelfScopeService as never,
    classSessionService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows SuperAdmin globally', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(true);

    await expect(service.canStaffAccessClass('user-1', 'class-1')).resolves.toBe(true);
  });

  it('allows assigned Catechist and denies unassigned', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    classService.getClassById.mockResolvedValue({ id: 'class-1', parishId: 'parish-1' });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'CATECHIST' }]);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    assertCatechistAssigned.mockResolvedValue(undefined);

    await expect(service.canStaffAccessClass('user-1', 'class-1')).resolves.toBe(true);

    assertCatechistAssigned.mockRejectedValue(new Error('no'));
    await expect(service.canStaffAccessClass('user-1', 'class-1')).resolves.toBe(false);
  });

  it('allows ParishAdmin only with own parish membership', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    classService.getClassById.mockResolvedValue({ id: 'class-1', parishId: 'parish-1' });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARISH_ADMIN' }]);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(true);

    await expect(service.canStaffAccessClass('admin-1', 'class-1')).resolves.toBe(true);

    parishScopeService.hasActiveParishMembership.mockResolvedValue(false);
    await expect(service.canStaffAccessClass('admin-1', 'class-1')).resolves.toBe(false);
  });

  it('denies Parent role alone even with parish membership', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    classService.getClassById.mockResolvedValue({ id: 'class-1', parishId: 'parish-1' });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARENT' }]);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(true);

    await expect(service.canStaffAccessClass('parent-1', 'class-1')).resolves.toBe(false);
  });

  it('allows Parent guardian and denies foreign child', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      id: 'enr-1',
      studentId: 'stu-1',
      classId: 'class-1',
    });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARENT' }]);
    studentGuardianService.assertGuardianLinked.mockResolvedValue(undefined);

    await expect(service.canReadEnrollmentAttendanceAsParent('parent-1', 'enr-1')).resolves.toBe(
      true,
    );

    studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('no link'));
    await expect(service.canReadEnrollmentAttendanceAsParent('parent-1', 'enr-1')).resolves.toBe(
      false,
    );
  });

  it('denies Catechist and SuperAdmin on parent /me without PARENT role', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      id: 'enr-1',
      studentId: 'stu-1',
      classId: 'class-1',
    });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'CATECHIST' }]);

    await expect(service.canReadEnrollmentAttendanceAsParent('catechist-1', 'enr-1')).resolves.toBe(
      false,
    );

    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'SUPER_ADMIN' }]);
    await expect(service.canReadEnrollmentAttendanceAsParent('super-1', 'enr-1')).resolves.toBe(
      false,
    );
  });

  it('allows Student self and denies foreign enrollment', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      id: 'enr-1',
      studentId: 'stu-1',
      classId: 'class-1',
    });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'STUDENT' }]);
    learnerSelfScopeService.assertActingAsLinkedStudent.mockResolvedValue(undefined);

    await expect(service.canReadEnrollmentAttendanceAsLearner('student-1', 'enr-1')).resolves.toBe(
      true,
    );

    learnerSelfScopeService.assertActingAsLinkedStudent.mockRejectedValue(new Error('no'));
    await expect(service.canReadEnrollmentAttendanceAsLearner('student-1', 'enr-1')).resolves.toBe(
      false,
    );
  });

  it('denies Parent and SuperAdmin on learner /me without STUDENT role', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      id: 'enr-1',
      studentId: 'stu-1',
      classId: 'class-1',
    });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARENT' }]);

    await expect(service.canReadEnrollmentAttendanceAsLearner('parent-1', 'enr-1')).resolves.toBe(
      false,
    );

    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'SUPER_ADMIN' }]);
    await expect(service.canReadEnrollmentAttendanceAsLearner('super-1', 'enr-1')).resolves.toBe(
      false,
    );
  });

  it('assertCanParentReadEnrollmentAttendance throws access denied', async () => {
    enrollmentService.getEnrollmentById.mockResolvedValue({
      id: 'enr-1',
      studentId: 'stu-1',
      classId: 'class-1',
    });
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARENT' }]);
    studentGuardianService.assertGuardianLinked.mockRejectedValue(new Error('no'));

    await expect(
      service.assertCanParentReadEnrollmentAttendance('parent-1', 'enr-1'),
    ).rejects.toBeInstanceOf(ClassOperationsAccessDeniedError);
  });
});
