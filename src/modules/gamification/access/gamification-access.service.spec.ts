import { RewardScopeType } from '../enums/gamification.enums';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';
import { GamificationAccessService } from '../access/gamification-access.service';

describe('GamificationAccessService capability-specific manage', () => {
  const parishScopeService = {
    isSuperAdmin: jest.fn(),
    hasActiveParishMembership: jest.fn(),
  };
  const accessControlService = {
    getRolesForUser: jest.fn(),
  };

  const service = new GamificationAccessService(
    accessControlService as never,
    parishScopeService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows SuperAdmin reward rule manage', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(true);
    await expect(
      service.assertCanManageRewardRules('u1', {
        scopeType: RewardScopeType.Global,
        parishId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('denies Catechist reward rule manage even with manage permission', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'CATECHIST' }]);
    await expect(
      service.assertCanManageRewardRules('u1', {
        scopeType: RewardScopeType.Parish,
        parishId: 'p1',
      }),
    ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
  });

  it('allows ParishAdmin own parish PARISH rules only', async () => {
    parishScopeService.isSuperAdmin.mockResolvedValue(false);
    accessControlService.getRolesForUser.mockResolvedValue([{ code: 'PARISH_ADMIN' }]);
    parishScopeService.hasActiveParishMembership.mockResolvedValue(true);
    await expect(
      service.assertCanManageRewardRules('u1', {
        scopeType: RewardScopeType.Parish,
        parishId: 'p1',
      }),
    ).resolves.toBeUndefined();

    await expect(
      service.assertCanManageRewardRules('u1', {
        scopeType: RewardScopeType.Global,
        parishId: null,
      }),
    ).rejects.toBeInstanceOf(GamificationAccessDeniedError);
  });
});
