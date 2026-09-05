import { RewardRuleStatus, RewardScopeType } from '../../enums/gamification.enums';
import { InvalidRewardRuleScopeError } from '../../errors/gamification.errors';
import {
  assertMaxAwardsPerSource,
  assertRewardRuleScope,
  isRewardRuleEffectiveAt,
} from './reward-rule.util';

describe('reward-rule.util', () => {
  it('validates GLOBAL/PARISH scope consistency', () => {
    expect(() =>
      assertRewardRuleScope({ scopeType: RewardScopeType.Global, parishId: null }),
    ).not.toThrow();
    expect(() =>
      assertRewardRuleScope({
        scopeType: RewardScopeType.Parish,
        parishId: '11111111-1111-4111-8111-111111111111',
      }),
    ).not.toThrow();
    expect(() =>
      assertRewardRuleScope({
        scopeType: RewardScopeType.Global,
        parishId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow(InvalidRewardRuleScopeError);
    expect(() =>
      assertRewardRuleScope({ scopeType: RewardScopeType.Parish, parishId: null }),
    ).toThrow(InvalidRewardRuleScopeError);
  });

  it('evaluates effective date windows for ACTIVE rules', () => {
    const at = new Date('2026-06-15T00:00:00.000Z');
    expect(
      isRewardRuleEffectiveAt(
        {
          status: RewardRuleStatus.Active,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: new Date('2026-12-31T00:00:00.000Z'),
        },
        at,
      ),
    ).toBe(true);
    expect(
      isRewardRuleEffectiveAt(
        {
          status: RewardRuleStatus.Inactive,
          effectiveFrom: null,
          effectiveTo: null,
        },
        at,
      ),
    ).toBe(false);
    expect(
      isRewardRuleEffectiveAt(
        {
          status: RewardRuleStatus.Active,
          effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
          effectiveTo: null,
        },
        at,
      ),
    ).toBe(false);
  });

  it('requires maxAwardsPerSource > 0', () => {
    expect(() => assertMaxAwardsPerSource(1)).not.toThrow();
    expect(() => assertMaxAwardsPerSource(0)).toThrow();
    expect(() => assertMaxAwardsPerSource(-1)).toThrow();
  });
});
