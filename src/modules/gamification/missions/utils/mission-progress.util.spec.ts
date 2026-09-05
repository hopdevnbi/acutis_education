import {
  MissionProgressStatus,
  MissionScopeType,
} from '../../enums/gamification.enums';
import { InvalidMissionScopeError } from '../../errors/gamification.errors';
import { buildMissionScopeKey } from '../../utils/reward-rule.util';
import {
  assertMissionCompletedAtSemantics,
  assertTargetCount,
  capMissionCurrentCount,
  resolveMissionProgressStatus,
} from './mission-progress.util';

describe('mission scope and progress helpers', () => {
  describe('buildMissionScopeKey', () => {
    it('builds scope_key without nullable uniqueness traps', () => {
      expect(
        buildMissionScopeKey({
          scopeType: MissionScopeType.Global,
          parishId: null,
          classId: null,
        }),
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
    });

    it('throws InvalidMissionScopeError when scope required fields are missing', () => {
      expect(() =>
        buildMissionScopeKey({
          scopeType: MissionScopeType.Class,
          parishId: null,
          classId: 'c1',
        }),
      ).toThrow(InvalidMissionScopeError);
      expect(() =>
        buildMissionScopeKey({
          scopeType: MissionScopeType.Class,
          parishId: 'p1',
          classId: null,
        }),
      ).toThrow(InvalidMissionScopeError);
      expect(() =>
        buildMissionScopeKey({
          scopeType: MissionScopeType.Parish,
          parishId: null,
          classId: null,
        }),
      ).toThrow(InvalidMissionScopeError);
    });
  });

  describe('assertTargetCount', () => {
    it('accepts target = 1 as minimal valid positive integer target', () => {
      expect(() => assertTargetCount(1)).not.toThrow();
    });

    it('accepts larger positive integers', () => {
      expect(() => assertTargetCount(10)).not.toThrow();
      expect(() => assertTargetCount(100)).not.toThrow();
    });

    it('rejects 0, negative values, and non-integers', () => {
      expect(() => assertTargetCount(0)).toThrow('targetCount must be an integer greater than 0.');
      expect(() => assertTargetCount(-1)).toThrow('targetCount must be an integer greater than 0.');
      expect(() => assertTargetCount(1.5)).toThrow('targetCount must be an integer greater than 0.');
    });
  });

  describe('capMissionCurrentCount', () => {
    it('caps current count at target = 1 boundary', () => {
      expect(capMissionCurrentCount(0, 1)).toBe(0);
      expect(capMissionCurrentCount(1, 1)).toBe(1);
      expect(capMissionCurrentCount(2, 1)).toBe(1);
      expect(capMissionCurrentCount(99, 1)).toBe(1);
    });

    it('caps current count at target > 1', () => {
      expect(capMissionCurrentCount(0, 10)).toBe(0);
      expect(capMissionCurrentCount(3, 10)).toBe(3);
      expect(capMissionCurrentCount(10, 10)).toBe(10);
      expect(capMissionCurrentCount(12, 10)).toBe(10);
      expect(capMissionCurrentCount(50, 10)).toBe(10);
    });

    it('throws when currentCount is negative or non-integer', () => {
      expect(() => capMissionCurrentCount(-1, 5)).toThrow(
        'currentCount must be a non-negative integer.',
      );
      expect(() => capMissionCurrentCount(2.5, 5)).toThrow(
        'currentCount must be a non-negative integer.',
      );
    });
  });

  describe('resolveMissionProgressStatus', () => {
    it('resolves Active vs Completed for target = 1', () => {
      expect(resolveMissionProgressStatus(0, 1)).toBe(MissionProgressStatus.Active);
      expect(resolveMissionProgressStatus(1, 1)).toBe(MissionProgressStatus.Completed);
      expect(resolveMissionProgressStatus(5, 1)).toBe(MissionProgressStatus.Completed);
    });

    it('resolves Active vs Completed for multi-step target', () => {
      expect(resolveMissionProgressStatus(0, 10)).toBe(MissionProgressStatus.Active);
      expect(resolveMissionProgressStatus(4, 10)).toBe(MissionProgressStatus.Active);
      expect(resolveMissionProgressStatus(9, 10)).toBe(MissionProgressStatus.Active);
      expect(resolveMissionProgressStatus(10, 10)).toBe(MissionProgressStatus.Completed);
      expect(resolveMissionProgressStatus(15, 10)).toBe(MissionProgressStatus.Completed);
    });
  });

  describe('assertMissionCompletedAtSemantics', () => {
    it('allows Completed status when completedAt is provided', () => {
      expect(() =>
        assertMissionCompletedAtSemantics({
          status: MissionProgressStatus.Completed,
          completedAt: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ).not.toThrow();
    });

    it('throws when Completed status lacks completedAt', () => {
      expect(() =>
        assertMissionCompletedAtSemantics({
          status: MissionProgressStatus.Completed,
          completedAt: null,
        }),
      ).toThrow('COMPLETED mission progress requires completedAt.');
    });

    it('allows Active status when completedAt is null', () => {
      expect(() =>
        assertMissionCompletedAtSemantics({
          status: MissionProgressStatus.Active,
          completedAt: null,
        }),
      ).not.toThrow();
    });

    it('throws when Active status has completedAt set', () => {
      expect(() =>
        assertMissionCompletedAtSemantics({
          status: MissionProgressStatus.Active,
          completedAt: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ).toThrow('ACTIVE mission progress must not have completedAt.');
    });
  });
});
