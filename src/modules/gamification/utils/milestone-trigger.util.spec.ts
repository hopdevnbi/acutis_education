import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import {
  MILESTONE_TRIGGER_TYPES,
  MilestoneTriggerType,
} from '../enums/gamification.enums';
import { InvalidMilestoneTriggerConfigError } from '../errors/gamification.errors';
import {
  doesMilestoneTriggerMatchEvent,
  isMilestoneTriggerType,
  milestoneTriggerToRewardEventType,
  parseAndValidateMilestoneTriggerConfig,
} from './milestone-trigger.util';

function makeEvent(
  partial: Partial<RewardEligibleEvent> & Pick<RewardEligibleEvent, 'eventType'>,
): RewardEligibleEvent {
  return {
    eventId: 'evt-1',
    occurredAt: new Date('2026-09-01T00:00:00.000Z'),
    studentId: '11111111-1111-4111-8111-111111111111',
    parishId: '22222222-2222-4222-8222-222222222222',
    sourceId: 'src-1',
    ...partial,
  };
}

describe('milestone-trigger.util', () => {
  describe('isMilestoneTriggerType / sacramental exclusion', () => {
    it('accepts system/learning trigger types only', () => {
      expect(isMilestoneTriggerType(MilestoneTriggerType.FirstLessonCompleted)).toBe(true);
      expect(isMilestoneTriggerType(MilestoneTriggerType.LessonsCompletedCount)).toBe(true);
      expect(isMilestoneTriggerType(MilestoneTriggerType.AttendanceCount)).toBe(true);
      expect(isMilestoneTriggerType(MilestoneTriggerType.FirstExamCompleted)).toBe(true);
      expect(isMilestoneTriggerType(MilestoneTriggerType.FirstMissionCompleted)).toBe(true);
    });

    it('excludes sacramental/pastoral trigger types', () => {
      const values = MILESTONE_TRIGGER_TYPES as readonly string[];
      expect(values).not.toContain('BAPTISM');
      expect(values).not.toContain('FIRST_COMMUNION');
      expect(values).not.toContain('CONFIRMATION');
      expect(values).not.toContain('CONFESSION');
      expect(values).not.toContain('SACRAMENTAL');
      expect(isMilestoneTriggerType('BAPTISM')).toBe(false);
    });
  });

  describe('parseAndValidateMilestoneTriggerConfig', () => {
    it('allows null/empty/{} for FIRST_* triggers', () => {
      expect(
        parseAndValidateMilestoneTriggerConfig(MilestoneTriggerType.FirstLessonCompleted, null),
      ).toBeNull();
      expect(
        parseAndValidateMilestoneTriggerConfig(MilestoneTriggerType.FirstExamCompleted, ''),
      ).toBeNull();
      expect(
        parseAndValidateMilestoneTriggerConfig(
          MilestoneTriggerType.FirstMissionCompleted,
          '{}',
        ),
      ).toBeNull();
    });

    it('parses count trigger configs', () => {
      expect(
        parseAndValidateMilestoneTriggerConfig(
          MilestoneTriggerType.LessonsCompletedCount,
          JSON.stringify({ minCount: 5 }),
        ),
      ).toEqual({ minCount: 5 });
      expect(
        parseAndValidateMilestoneTriggerConfig(
          MilestoneTriggerType.AttendanceCount,
          JSON.stringify({ minCount: 8 }),
        ),
      ).toEqual({ minCount: 8 });
    });

    it('rejects invalid count configs', () => {
      expect(() =>
        parseAndValidateMilestoneTriggerConfig(MilestoneTriggerType.AttendanceCount, null),
      ).toThrow(InvalidMilestoneTriggerConfigError);
      expect(() =>
        parseAndValidateMilestoneTriggerConfig(
          MilestoneTriggerType.LessonsCompletedCount,
          JSON.stringify({ minCount: 0 }),
        ),
      ).toThrow(InvalidMilestoneTriggerConfigError);
    });
  });

  describe('doesMilestoneTriggerMatchEvent', () => {
    it('matches first lesson when count >= 1', () => {
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.FirstLessonCompleted,
          triggerConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 1,
        }),
      ).toBe(true);
    });

    it('matches lesson count trigger', () => {
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.LessonsCompletedCount,
          triggerConfigJson: JSON.stringify({ minCount: 3 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 3,
        }),
      ).toBe(true);
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.LessonsCompletedCount,
          triggerConfigJson: JSON.stringify({ minCount: 3 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 2,
        }),
      ).toBe(false);
    });

    it('matches attendance count trigger', () => {
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.AttendanceCount,
          triggerConfigJson: JSON.stringify({ minCount: 2 }),
          event: makeEvent({
            eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
          }),
          eventCountForMappedType: 2,
        }),
      ).toBe(true);
    });

    it('matches first exam when count >= 1', () => {
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.FirstExamCompleted,
          triggerConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.ExamCompleted }),
          eventCountForMappedType: 1,
        }),
      ).toBe(true);
    });

    it('matches FIRST_MISSION_COMPLETED when eventType is MISSION_COMPLETED and count >= 1', () => {
      expect(milestoneTriggerToRewardEventType(MilestoneTriggerType.FirstMissionCompleted)).toBe(
        REWARD_EVENT_TYPES.MissionCompleted,
      );
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.FirstMissionCompleted,
          triggerConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.MissionCompleted }),
          eventCountForMappedType: 1,
        }),
      ).toBe(true);
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.FirstMissionCompleted,
          triggerConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.MissionCompleted }),
          eventCountForMappedType: 0,
        }),
      ).toBe(false);
      expect(
        doesMilestoneTriggerMatchEvent({
          triggerType: MilestoneTriggerType.FirstMissionCompleted,
          triggerConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 99,
        }),
      ).toBe(false);
    });
  });
});
