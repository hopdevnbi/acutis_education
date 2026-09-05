import { MissionDefinitionStatus } from '../../enums/gamification.enums';
import { InvalidMissionLifecycleTransitionError } from '../../errors/gamification.errors';
import {
  MISSION_ACTIVE_EDITABLE_FIELDS,
  assertMissionLifecycleTransition,
} from './mission-lifecycle.util';

describe('mission-lifecycle.util', () => {
  describe('assertMissionLifecycleTransition', () => {
    it('allows DRAFT -> ACTIVE transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Draft,
          MissionDefinitionStatus.Active,
        ),
      ).not.toThrow();
    });

    it('allows DRAFT -> ARCHIVED transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Draft,
          MissionDefinitionStatus.Archived,
        ),
      ).not.toThrow();
    });

    it('allows ACTIVE -> ARCHIVED transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Active,
          MissionDefinitionStatus.Archived,
        ),
      ).not.toThrow();
    });

    it('allows identity (same status) transitions as no-ops', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Draft,
          MissionDefinitionStatus.Draft,
        ),
      ).not.toThrow();
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Active,
          MissionDefinitionStatus.Active,
        ),
      ).not.toThrow();
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Archived,
          MissionDefinitionStatus.Archived,
        ),
      ).not.toThrow();
    });

    it('denies ARCHIVED -> ACTIVE transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Archived,
          MissionDefinitionStatus.Active,
        ),
      ).toThrow(InvalidMissionLifecycleTransitionError);
    });

    it('denies ACTIVE -> DRAFT transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Active,
          MissionDefinitionStatus.Draft,
        ),
      ).toThrow(InvalidMissionLifecycleTransitionError);
    });

    it('denies ARCHIVED -> DRAFT transition', () => {
      expect(() =>
        assertMissionLifecycleTransition(
          MissionDefinitionStatus.Archived,
          MissionDefinitionStatus.Draft,
        ),
      ).toThrow(InvalidMissionLifecycleTransitionError);
    });
  });

  describe('MISSION_ACTIVE_EDITABLE_FIELDS', () => {
    it('contains only name, description, and endsAt', () => {
      expect(MISSION_ACTIVE_EDITABLE_FIELDS).toEqual(['name', 'description', 'endsAt']);
    });

    it('excludes immutable mission definition fields', () => {
      const activeFields = MISSION_ACTIVE_EDITABLE_FIELDS as readonly string[];
      expect(activeFields).not.toContain('code');
      expect(activeFields).not.toContain('scopeType');
      expect(activeFields).not.toContain('parishId');
      expect(activeFields).not.toContain('classId');
      expect(activeFields).not.toContain('conditionType');
      expect(activeFields).not.toContain('targetCount');
      expect(activeFields).not.toContain('pointsBonus');
      expect(activeFields).not.toContain('startsAt');
    });
  });
});
