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

  const service = new ClassOperationsAccessService(
    accessControlService as never,
    parishScopeService as never,
    classService as never,
    classCatechistAssignmentService as never,
    {} as never,
    {} as never,
    {} as never,
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
});
