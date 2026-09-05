import { MissionScopeType, RewardRuleStatus, RewardScopeType } from '../enums/gamification.enums';
import { InvalidMissionScopeError, InvalidRewardRuleScopeError } from '../errors/gamification.errors';

export function buildMissionScopeKey(input: {
  readonly scopeType: MissionScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
}): string {
  switch (input.scopeType) {
    case MissionScopeType.Global:
      if (input.parishId || input.classId) {
        throw new InvalidMissionScopeError();
      }
      return 'GLOBAL';
    case MissionScopeType.Parish: {
      if (!input.parishId || input.classId) {
        throw new InvalidMissionScopeError();
      }
      return `PARISH:${input.parishId}`;
    }
    case MissionScopeType.Class: {
      if (!input.parishId || !input.classId) {
        throw new InvalidMissionScopeError();
      }
      return `CLASS:${input.classId}`;
    }
    default:
      throw new InvalidMissionScopeError();
  }
}

export function assertRewardRuleScope(input: {
  readonly scopeType: RewardScopeType;
  readonly parishId?: string | null;
}): void {
  if (input.scopeType === RewardScopeType.Global && input.parishId) {
    throw new InvalidRewardRuleScopeError();
  }
  if (input.scopeType === RewardScopeType.Parish && !input.parishId) {
    throw new InvalidRewardRuleScopeError();
  }
}

export function isRewardRuleEffectiveAt(
  rule: {
    readonly status: RewardRuleStatus;
    readonly effectiveFrom: Date | null;
    readonly effectiveTo: Date | null;
  },
  at: Date,
): boolean {
  if (rule.status !== RewardRuleStatus.Active) {
    return false;
  }
  if (rule.effectiveFrom && at < rule.effectiveFrom) {
    return false;
  }
  if (rule.effectiveTo && at >= rule.effectiveTo) {
    return false;
  }
  return true;
}

export function assertMaxAwardsPerSource(value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('maxAwardsPerSource must be an integer greater than 0.');
  }
}
