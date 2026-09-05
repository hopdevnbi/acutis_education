/**
 * Re-exports coverage against the shared util under `../../utils/milestone-trigger.util`.
 * Sacramental exclusion + parse/match happy paths live here so milestones package specs
 * stay discoverable without duplicating implementation.
 */
import {
  MILESTONE_TRIGGER_TYPES,
  MilestoneTriggerType,
} from '../../enums/gamification.enums';
import { InvalidMilestoneTriggerConfigError } from '../../errors/gamification.errors';
import {
  doesMilestoneTriggerMatchEvent,
  isMilestoneTriggerType,
  parseAndValidateMilestoneTriggerConfig,
} from '../../utils/milestone-trigger.util';
import { REWARD_EVENT_TYPES } from '../../../application-events/contracts/reward-eligible-event.contract';

describe('milestone trigger util (milestones package entry)', () => {
  it('includes only system/learning trigger types', () => {
    expect(MILESTONE_TRIGGER_TYPES).toEqual(
      expect.arrayContaining([
        MilestoneTriggerType.FirstLessonCompleted,
        MilestoneTriggerType.LessonsCompletedCount,
        MilestoneTriggerType.AttendanceCount,
        MilestoneTriggerType.FirstExamCompleted,
        MilestoneTriggerType.FirstMissionCompleted,
      ]),
    );
    expect(MILESTONE_TRIGGER_TYPES).toHaveLength(5);
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

  it('parses FIRST_* with null config and count triggers with minCount', () => {
    expect(
      parseAndValidateMilestoneTriggerConfig(MilestoneTriggerType.FirstLessonCompleted, null),
    ).toBeNull();
    expect(
      parseAndValidateMilestoneTriggerConfig(
        MilestoneTriggerType.LessonsCompletedCount,
        JSON.stringify({ minCount: 4 }),
      ),
    ).toEqual({ minCount: 4 });
    expect(() =>
      parseAndValidateMilestoneTriggerConfig(
        MilestoneTriggerType.AttendanceCount,
        JSON.stringify({ minCount: -1 }),
      ),
    ).toThrow(InvalidMilestoneTriggerConfigError);
  });

  it('matches first lesson and never matches FIRST_MISSION_COMPLETED', () => {
    expect(
      doesMilestoneTriggerMatchEvent({
        triggerType: MilestoneTriggerType.FirstLessonCompleted,
        triggerConfigJson: null,
        event: {
          eventId: 'e1',
          eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
          occurredAt: new Date('2026-09-01T00:00:00.000Z'),
          studentId: '11111111-1111-4111-8111-111111111111',
          parishId: '22222222-2222-4222-8222-222222222222',
          sourceId: 's1',
        },
        eventCountForMappedType: 1,
      }),
    ).toBe(true);

    expect(
      doesMilestoneTriggerMatchEvent({
        triggerType: MilestoneTriggerType.FirstMissionCompleted,
        triggerConfigJson: null,
        event: {
          eventId: 'e2',
          eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
          occurredAt: new Date('2026-09-01T00:00:00.000Z'),
          studentId: '11111111-1111-4111-8111-111111111111',
          parishId: '22222222-2222-4222-8222-222222222222',
          sourceId: 's2',
        },
        eventCountForMappedType: 1,
      }),
    ).toBe(false);
  });
});
