import { MissionScopeType } from '../enums/gamification.enums';
import { InvalidMissionScopeError } from '../errors/gamification.errors';
import { buildMissionScopeKey } from './reward-rule.util';
import {
  assertMissionCompletedAtSemantics,
  assertTargetCount,
  capMissionCurrentCount,
  resolveMissionProgressStatus,
} from '../missions/utils/mission-progress.util';
import { MissionProgressStatus } from '../enums/gamification.enums';

describe('mission scope and progress helpers', () => {
  it('builds scope_key without nullable uniqueness traps', () => {
    expect(
      buildMissionScopeKey({ scopeType: MissionScopeType.Global, parishId: null, classId: null }),
    ).toBe('GLOBAL');
    expect(
      buildMissionScopeKey({
        scopeType: MissionScopeType.Parish,
        parishId: 'p1',
        classId: null,
      }),
    ).toBe('PARISH:p1');
    expect(
      buildMissionScopeKey({
        scopeType: MissionScopeType.Class,
        parishId: 'p1',
        classId: 'c1',
      }),
    ).toBe('CLASS:c1');
    expect(() =>
      buildMissionScopeKey({
        scopeType: MissionScopeType.Class,
        parishId: null,
        classId: 'c1',
      }),
    ).toThrow(InvalidMissionScopeError);
  });

  it('validates target count and caps current count', () => {
    expect(() => assertTargetCount(0)).toThrow();
    expect(capMissionCurrentCount(12, 10)).toBe(10);
    expect(capMissionCurrentCount(3, 10)).toBe(3);
  });

  it('resolves completed status and completedAt semantics', () => {
    expect(resolveMissionProgressStatus(10, 10)).toBe(MissionProgressStatus.Completed);
    expect(resolveMissionProgressStatus(4, 10)).toBe(MissionProgressStatus.Active);
    expect(() =>
      assertMissionCompletedAtSemantics({
        status: MissionProgressStatus.Completed,
        completedAt: null,
      }),
    ).toThrow();
    expect(() =>
      assertMissionCompletedAtSemantics({
        status: MissionProgressStatus.Active,
        completedAt: new Date(),
      }),
    ).toThrow();
  });
});
