import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { CmsScopeType } from '../enums/cms.enums';
import {
  CmsAccessDeniedError,
  CmsScopeAccessDeniedError,
  InvalidCmsScopeError,
} from '../errors/cms.errors';
import { CmsAccessService } from './cms-access.service';

describe('CmsAccessService', () => {
  let service: CmsAccessService;
  let accessControlService: jest.Mocked<AccessControlService>;
  let parishScopeService: jest.Mocked<ParishScopeService>;

  const superAdminUserId = '11111111-1111-4111-8111-111111111111';
  const parishAdminUserId = '22222222-2222-4222-8222-222222222222';
  const parishId = '33333333-3333-4333-8333-333333333333';
  const otherParishId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    accessControlService = {
      getRolesForUser: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === superAdminUserId) {
          return [{ code: SUPER_ADMIN_ROLE_CODE, name: 'Super Admin' }];
        }
        return [{ code: 'PARISH_ADMIN', name: 'Parish Admin' }];
      }),
    } as unknown as jest.Mocked<AccessControlService>;

    parishScopeService = {
      hasActiveParishMembership: jest.fn().mockImplementation(
        async (userId: string, targetParishId: string) => {
          return userId === parishAdminUserId && targetParishId === parishId;
        },
      ),
      listActiveParishIdsForMember: jest.fn().mockImplementation(async (userId: string) => {
        return userId === parishAdminUserId ? [parishId] : [];
      }),
    } as unknown as jest.Mocked<ParishScopeService>;

    service = new CmsAccessService(accessControlService, parishScopeService);
  });

  describe('isSuperAdmin', () => {
    it('returns true for SUPER_ADMIN role', async () => {
      await expect(service.isSuperAdmin(superAdminUserId)).resolves.toBe(true);
    });

    it('returns false for other roles', async () => {
      await expect(service.isSuperAdmin(parishAdminUserId)).resolves.toBe(false);
    });
  });

  describe('assertCanManageCmsScope', () => {
    it('permits SuperAdmin to manage GLOBAL scope', async () => {
      await expect(
        service.assertCanManageCmsScope(superAdminUserId, {
          scopeType: CmsScopeType.Global,
        }),
      ).resolves.toBeUndefined();
    });

    it('permits SuperAdmin to manage any PARISH scope', async () => {
      await expect(
        service.assertCanManageCmsScope(superAdminUserId, {
          scopeType: CmsScopeType.Parish,
          parishId: otherParishId,
        }),
      ).resolves.toBeUndefined();
    });

    it('denies ParishAdmin from managing GLOBAL scope', async () => {
      await expect(
        service.assertCanManageCmsScope(parishAdminUserId, {
          scopeType: CmsScopeType.Global,
        }),
      ).rejects.toThrow(CmsScopeAccessDeniedError);
    });

    it('permits ParishAdmin to manage their own parish', async () => {
      await expect(
        service.assertCanManageCmsScope(parishAdminUserId, {
          scopeType: CmsScopeType.Parish,
          parishId,
        }),
      ).resolves.toBeUndefined();
    });

    it('denies ParishAdmin from managing another parish', async () => {
      await expect(
        service.assertCanManageCmsScope(parishAdminUserId, {
          scopeType: CmsScopeType.Parish,
          parishId: otherParishId,
        }),
      ).rejects.toThrow(CmsScopeAccessDeniedError);
    });

    it('throws InvalidCmsScopeError when parishId is missing for parish scope', async () => {
      await expect(
        service.assertCanManageCmsScope(parishAdminUserId, {
          scopeType: CmsScopeType.Parish,
          parishId: null,
        }),
      ).rejects.toThrow(InvalidCmsScopeError);
    });
  });

  describe('assertCanReadParishCms', () => {
    it('denies anonymous callers from parish content', async () => {
      await expect(service.assertCanReadParishCms(null, parishId)).rejects.toThrow(
        CmsAccessDeniedError,
      );
    });

    it('permits SuperAdmin to read any parish content', async () => {
      await expect(
        service.assertCanReadParishCms(superAdminUserId, otherParishId),
      ).resolves.toBeUndefined();
    });

    it('permits member to read own parish content', async () => {
      await expect(
        service.assertCanReadParishCms(parishAdminUserId, parishId),
      ).resolves.toBeUndefined();
    });

    it('denies non-member from other parish content', async () => {
      await expect(
        service.assertCanReadParishCms(parishAdminUserId, otherParishId),
      ).rejects.toThrow(CmsAccessDeniedError);
    });
  });
});
