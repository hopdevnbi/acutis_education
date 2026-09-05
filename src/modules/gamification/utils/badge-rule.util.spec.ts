import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { BadgeRuleType } from '../enums/gamification.enums';
import { InvalidBadgeRuleConfigError } from '../errors/gamification.errors';
import {
  doesBadgeRuleMatchEvent,
  isBadgeRuleType,
  parseAndValidateBadgeRuleConfig,
} from './badge-rule.util';

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

describe('badge-rule.util', () => {
  describe('isBadgeRuleType', () => {
    it('accepts known badge rule types', () => {
      expect(isBadgeRuleType(BadgeRuleType.FirstLessonCompleted)).toBe(true);
      expect(isBadgeRuleType(BadgeRuleType.LessonsCompletedCount)).toBe(true);
      expect(isBadgeRuleType(BadgeRuleType.ExamScoreThreshold)).toBe(true);
      expect(isBadgeRuleType(BadgeRuleType.AttendancePresentOrLateCount)).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isBadgeRuleType('BAPTISM')).toBe(false);
      expect(isBadgeRuleType('FIRST_MISSION_COMPLETED')).toBe(false);
      expect(isBadgeRuleType('')).toBe(false);
    });
  });

  describe('parseAndValidateBadgeRuleConfig', () => {
    it('allows null/empty/{} for FIRST_* rules', () => {
      expect(
        parseAndValidateBadgeRuleConfig(BadgeRuleType.FirstLessonCompleted, null),
      ).toBeNull();
      expect(
        parseAndValidateBadgeRuleConfig(BadgeRuleType.FirstLessonCompleted, ''),
      ).toBeNull();
      expect(
        parseAndValidateBadgeRuleConfig(BadgeRuleType.FirstExamCompleted, '{}'),
      ).toBeNull();
    });

    it('rejects non-empty config for FIRST_* rules', () => {
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.FirstLessonCompleted,
          JSON.stringify({ minCount: 1 }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
    });

    it('parses count configs', () => {
      expect(
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.LessonsCompletedCount,
          JSON.stringify({ minCount: 5 }),
        ),
      ).toEqual({ minCount: 5 });
      expect(
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.PracticeCompletedCount,
          JSON.stringify({ minCount: 1 }),
        ),
      ).toEqual({ minCount: 1 });
      expect(
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.AttendancePresentOrLateCount,
          JSON.stringify({ minCount: 10 }),
        ),
      ).toEqual({ minCount: 10 });
    });

    it('rejects invalid count configs', () => {
      expect(() =>
        parseAndValidateBadgeRuleConfig(BadgeRuleType.LessonsCompletedCount, null),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.LessonsCompletedCount,
          JSON.stringify({ minCount: 0 }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.LessonsCompletedCount,
          JSON.stringify({ minCount: 1.5 }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.LessonsCompletedCount,
          JSON.stringify({ minCount: 1, extra: true }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
    });

    it('parses exam score threshold config', () => {
      expect(
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.ExamScoreThreshold,
          JSON.stringify({ minScorePercent: 80 }),
        ),
      ).toEqual({ minScorePercent: 80 });
      expect(
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.ExamScoreThreshold,
          JSON.stringify({ minScorePercent: 0 }),
        ),
      ).toEqual({ minScorePercent: 0 });
    });

    it('rejects invalid exam score configs', () => {
      expect(() =>
        parseAndValidateBadgeRuleConfig(BadgeRuleType.ExamScoreThreshold, null),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.ExamScoreThreshold,
          JSON.stringify({ minScorePercent: 101 }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(
          BadgeRuleType.ExamScoreThreshold,
          JSON.stringify({ minCount: 1 }),
        ),
      ).toThrow(InvalidBadgeRuleConfigError);
    });

    it('rejects invalid JSON', () => {
      expect(() =>
        parseAndValidateBadgeRuleConfig(BadgeRuleType.FirstLessonCompleted, '{'),
      ).toThrow(InvalidBadgeRuleConfigError);
      expect(() =>
        parseAndValidateBadgeRuleConfig(BadgeRuleType.FirstLessonCompleted, '[]'),
      ).toThrow(InvalidBadgeRuleConfigError);
    });
  });

  describe('doesBadgeRuleMatchEvent', () => {
    it('matches first lesson when count >= 1', () => {
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.FirstLessonCompleted,
          ruleConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 1,
        }),
      ).toBe(true);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.FirstLessonCompleted,
          ruleConfigJson: null,
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 0,
        }),
      ).toBe(false);
    });

    it('matches count rules against mapped event type', () => {
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.LessonsCompletedCount,
          ruleConfigJson: JSON.stringify({ minCount: 3 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 3,
        }),
      ).toBe(true);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.LessonsCompletedCount,
          ruleConfigJson: JSON.stringify({ minCount: 3 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 2,
        }),
      ).toBe(false);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.PracticeCompletedCount,
          ruleConfigJson: JSON.stringify({ minCount: 2 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.PracticeCompleted }),
          eventCountForMappedType: 2,
        }),
      ).toBe(true);
    });

    it('matches exam score threshold from metadata', () => {
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.ExamScoreThreshold,
          ruleConfigJson: JSON.stringify({ minScorePercent: 75 }),
          event: makeEvent({
            eventType: REWARD_EVENT_TYPES.ExamCompleted,
            metadata: { scorePercent: 80 },
          }),
          eventCountForMappedType: 1,
        }),
      ).toBe(true);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.ExamScoreThreshold,
          ruleConfigJson: JSON.stringify({ minScorePercent: 75 }),
          event: makeEvent({
            eventType: REWARD_EVENT_TYPES.ExamCompleted,
            metadata: { scorePercent: 70 },
          }),
          eventCountForMappedType: 1,
        }),
      ).toBe(false);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.ExamScoreThreshold,
          ruleConfigJson: JSON.stringify({ minScorePercent: 75 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.ExamCompleted }),
          eventCountForMappedType: 1,
        }),
      ).toBe(false);
    });

    it('matches attendance present-or-late count', () => {
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.AttendancePresentOrLateCount,
          ruleConfigJson: JSON.stringify({ minCount: 4 }),
          event: makeEvent({
            eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
          }),
          eventCountForMappedType: 4,
        }),
      ).toBe(true);
      expect(
        doesBadgeRuleMatchEvent({
          ruleType: BadgeRuleType.AttendancePresentOrLateCount,
          ruleConfigJson: JSON.stringify({ minCount: 4 }),
          event: makeEvent({ eventType: REWARD_EVENT_TYPES.LearningLessonCompleted }),
          eventCountForMappedType: 4,
        }),
      ).toBe(false);
    });
  });
});
