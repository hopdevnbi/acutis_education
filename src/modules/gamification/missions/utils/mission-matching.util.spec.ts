import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../../application-events/contracts/reward-eligible-event.contract';
import {
  MissionConditionType,
  MissionDefinitionStatus,
  MissionScopeType,
} from '../../enums/gamification.enums';
import type { MissionDefinitionSnapshot } from '../../interfaces/gamification.interfaces';
import {
  buildMissionCompletionReasonCode,
  doesMissionMatchEvent,
  doesMissionScopeMatchEvent,
  isMissionEffectiveAt,
  rewardEventTypeToMissionCondition,
} from './mission-matching.util';

function makeEvent(
  partial?: Partial<RewardEligibleEvent>,
): RewardEligibleEvent {
  return {
    eventId: 'evt-1',
    eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
    occurredAt: new Date('2026-09-01T10:00:00.000Z'),
    studentId: '11111111-1111-4111-8111-111111111111',
    parishId: '22222222-2222-4222-8222-222222222222',
    enrollmentId: '33333333-3333-4333-8333-333333333333',
    academicYearId: '44444444-4444-4444-8444-444444444444',
    classId: '55555555-5555-4555-8555-555555555555',
    sourceId: 'src-1',
    metadataJson: null,
    ...partial,
  };
}

function makeMissionSnapshot(
  partial?: Partial<MissionDefinitionSnapshot>,
): MissionDefinitionSnapshot {
  return {
    id: 'm-1',
    code: 'MISSION_TEST',
    name: 'Test Mission',
    description: 'Description',
    status: MissionDefinitionStatus.Active,
    scopeType: MissionScopeType.Global,
    parishId: null,
    classId: null,
    conditionType: MissionConditionType.LessonsCompleted,
    targetCount: 5,
    pointsBonus: 50,
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

describe('mission-matching.util', () => {
  describe('rewardEventTypeToMissionCondition', () => {
    it('maps LearningLessonCompleted to LessonsCompleted', () => {
      expect(
        rewardEventTypeToMissionCondition(REWARD_EVENT_TYPES.LearningLessonCompleted),
      ).toBe(MissionConditionType.LessonsCompleted);
    });

    it('maps PracticeCompleted to PracticeCompleted', () => {
      expect(
        rewardEventTypeToMissionCondition(REWARD_EVENT_TYPES.PracticeCompleted),
      ).toBe(MissionConditionType.PracticeCompleted);
    });

    it('maps AttendanceSessionCompletedMark to AttendancePresentOrLate', () => {
      expect(
        rewardEventTypeToMissionCondition(
          REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
        ),
      ).toBe(MissionConditionType.AttendancePresentOrLate);
    });

    it('maps ExamCompleted to ExamsCompleted', () => {
      expect(
        rewardEventTypeToMissionCondition(REWARD_EVENT_TYPES.ExamCompleted),
      ).toBe(MissionConditionType.ExamsCompleted);
    });

    it('returns null for unmapped or unknown event types', () => {
      expect(
        rewardEventTypeToMissionCondition(REWARD_EVENT_TYPES.MissionCompleted),
      ).toBeNull();
      expect(rewardEventTypeToMissionCondition('UNKNOWN_EVENT_TYPE')).toBeNull();
    });
  });

  describe('doesMissionScopeMatchEvent', () => {
    const parishA = '22222222-2222-4222-8222-222222222222';
    const parishB = '99999999-9999-4999-8999-999999999999';
    const classA = '55555555-5555-4555-8555-555555555555';
    const classB = '88888888-8888-4888-8888-888888888888';

    it('matches GLOBAL missions for any event', () => {
      const mission = {
        scopeType: MissionScopeType.Global,
        parishId: null,
        classId: null,
      };
      expect(doesMissionScopeMatchEvent(mission, makeEvent({ parishId: parishA }))).toBe(true);
      expect(doesMissionScopeMatchEvent(mission, makeEvent({ parishId: parishB }))).toBe(true);
    });

    it('matches PARISH missions only when event parishId matches', () => {
      const mission = {
        scopeType: MissionScopeType.Parish,
        parishId: parishA,
        classId: null,
      };
      expect(doesMissionScopeMatchEvent(mission, makeEvent({ parishId: parishA }))).toBe(true);
      expect(doesMissionScopeMatchEvent(mission, makeEvent({ parishId: parishB }))).toBe(false);
    });

    it('returns false for PARISH missions when parishId is missing', () => {
      const mission = {
        scopeType: MissionScopeType.Parish,
        parishId: null,
        classId: null,
      };
      expect(doesMissionScopeMatchEvent(mission, makeEvent({ parishId: parishA }))).toBe(false);
    });

    it('matches CLASS missions only when event classId matches and is non-null', () => {
      const mission = {
        scopeType: MissionScopeType.Class,
        parishId: parishA,
        classId: classA,
      };
      expect(
        doesMissionScopeMatchEvent(
          mission,
          makeEvent({ parishId: parishA, classId: classA }),
        ),
      ).toBe(true);
      expect(
        doesMissionScopeMatchEvent(
          mission,
          makeEvent({ parishId: parishA, classId: classB }),
        ),
      ).toBe(false);
    });

    it('returns false for CLASS missions when mission classId or event classId is null', () => {
      const missionWithoutClass = {
        scopeType: MissionScopeType.Class,
        parishId: parishA,
        classId: null,
      };
      expect(
        doesMissionScopeMatchEvent(
          missionWithoutClass,
          makeEvent({ parishId: parishA, classId: classA }),
        ),
      ).toBe(false);

      const missionWithClass = {
        scopeType: MissionScopeType.Class,
        parishId: parishA,
        classId: classA,
      };
      expect(
        doesMissionScopeMatchEvent(
          missionWithClass,
          makeEvent({ parishId: parishA, classId: null }),
        ),
      ).toBe(false);
    });

    it('returns false for unsupported or wrong scope type', () => {
      const wrongScope = {
        scopeType: 'OTHER' as unknown as MissionScopeType,
        parishId: parishA,
        classId: classA,
      };
      expect(doesMissionScopeMatchEvent(wrongScope, makeEvent())).toBe(false);
    });
  });

  describe('isMissionEffectiveAt', () => {
    const startsAt = new Date('2026-09-01T00:00:00.000Z');
    const endsAt = new Date('2026-09-30T23:59:59.999Z');

    it('returns true when status is ACTIVE and within date window', () => {
      const mission = {
        status: MissionDefinitionStatus.Active,
        startsAt,
        endsAt,
      };
      const during = new Date('2026-09-15T12:00:00.000Z');
      expect(isMissionEffectiveAt(mission, during)).toBe(true);
    });

    it('returns true when status is ACTIVE and dates are null (open-ended)', () => {
      const mission = {
        status: MissionDefinitionStatus.Active,
        startsAt: null,
        endsAt: null,
      };
      expect(isMissionEffectiveAt(mission, new Date('2026-09-15T12:00:00.000Z'))).toBe(true);
    });

    it('returns false when status is DRAFT or ARCHIVED', () => {
      const draft = {
        status: MissionDefinitionStatus.Draft,
        startsAt: null,
        endsAt: null,
      };
      const archived = {
        status: MissionDefinitionStatus.Archived,
        startsAt: null,
        endsAt: null,
      };
      const at = new Date('2026-09-15T12:00:00.000Z');
      expect(isMissionEffectiveAt(draft, at)).toBe(false);
      expect(isMissionEffectiveAt(archived, at)).toBe(false);
    });

    it('returns false when event occurred before startsAt', () => {
      const mission = {
        status: MissionDefinitionStatus.Active,
        startsAt,
        endsAt,
      };
      const before = new Date('2026-08-31T23:59:59.999Z');
      expect(isMissionEffectiveAt(mission, before)).toBe(false);
    });

    it('returns false when event occurred at or after endsAt', () => {
      const mission = {
        status: MissionDefinitionStatus.Active,
        startsAt,
        endsAt,
      };
      expect(isMissionEffectiveAt(mission, endsAt)).toBe(false);
      const after = new Date('2026-10-01T00:00:00.000Z');
      expect(isMissionEffectiveAt(mission, after)).toBe(false);
    });
  });

  describe('doesMissionMatchEvent', () => {
    it('returns true when condition, effective window, and scope match', () => {
      const mission = makeMissionSnapshot({
        scopeType: MissionScopeType.Global,
        conditionType: MissionConditionType.LessonsCompleted,
        status: MissionDefinitionStatus.Active,
      });
      const event = makeEvent({
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
      });

      expect(
        doesMissionMatchEvent(mission, event, MissionConditionType.LessonsCompleted),
      ).toBe(true);
    });

    it('returns false when conditionType does not match', () => {
      const mission = makeMissionSnapshot({
        conditionType: MissionConditionType.ExamsCompleted,
        status: MissionDefinitionStatus.Active,
      });
      const event = makeEvent({
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
      });

      expect(
        doesMissionMatchEvent(mission, event, MissionConditionType.LessonsCompleted),
      ).toBe(false);
    });

    it('returns false when mission is not effective at event time', () => {
      const mission = makeMissionSnapshot({
        conditionType: MissionConditionType.LessonsCompleted,
        status: MissionDefinitionStatus.Archived,
      });
      const event = makeEvent({
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
      });

      expect(
        doesMissionMatchEvent(mission, event, MissionConditionType.LessonsCompleted),
      ).toBe(false);
    });

    it('returns false when scope does not match', () => {
      const mission = makeMissionSnapshot({
        scopeType: MissionScopeType.Parish,
        parishId: '11111111-2222-3333-4444-555555555555',
        conditionType: MissionConditionType.LessonsCompleted,
        status: MissionDefinitionStatus.Active,
      });
      const event = makeEvent({
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
        parishId: '99999999-8888-7777-6666-555555555555',
      });

      expect(
        doesMissionMatchEvent(mission, event, MissionConditionType.LessonsCompleted),
      ).toBe(false);
    });
  });

  describe('buildMissionCompletionReasonCode', () => {
    it('formats code as MISSION_COMPLETION:<missionCode>', () => {
      expect(buildMissionCompletionReasonCode('CATECHISM_101')).toBe(
        'MISSION_COMPLETION:CATECHISM_101',
      );
    });
  });
});
