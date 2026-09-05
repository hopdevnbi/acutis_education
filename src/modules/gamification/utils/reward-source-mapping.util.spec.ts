import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { PointSourceType, RewardRuleStatus, RewardScopeType } from '../enums/gamification.enums';
import type { RewardRuleSnapshot } from '../interfaces/gamification.interfaces';
import {
  doesRuleMatchEvent,
  parseExamScoreThresholdCondition,
  resolveEventPointSourceCandidates,
} from './reward-source-mapping.util';

function baseEvent(overrides: Partial<RewardEligibleEvent> = {}): RewardEligibleEvent {
  return {
    eventId: '11111111-1111-4111-8111-111111111111',
    eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
    occurredAt: new Date('2026-06-15T00:00:00.000Z'),
    studentId: '22222222-2222-4222-8222-222222222222',
    parishId: '33333333-3333-4333-8333-333333333333',
    sourceId: '44444444-4444-4444-8444-444444444444',
    ...overrides,
  };
}

function baseRule(overrides: Partial<RewardRuleSnapshot> = {}): RewardRuleSnapshot {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    code: 'LESSON_10',
    eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
    sourceType: PointSourceType.LessonCompleted,
    points: 10,
    status: RewardRuleStatus.Active,
    maxAwardsPerSource: 1,
    scopeType: RewardScopeType.Global,
    parishId: null,
    effectiveFrom: null,
    effectiveTo: null,
    conditionConfigJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('reward-source-mapping.util', () => {
  it('maps attendance PRESENT/LATE and ignores ABSENT/EXCUSED', () => {
    expect(
      resolveEventPointSourceCandidates(
        baseEvent({
          eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
          metadata: { attendanceStatus: 'PRESENT' },
        }),
      ),
    ).toEqual([PointSourceType.AttendancePresent]);
    expect(
      resolveEventPointSourceCandidates(
        baseEvent({
          eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
          metadata: { attendanceStatus: 'LATE' },
        }),
      ),
    ).toEqual([PointSourceType.AttendanceLate]);
    expect(
      resolveEventPointSourceCandidates(
        baseEvent({
          eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
          metadata: { attendanceStatus: 'ABSENT' },
        }),
      ),
    ).toEqual([]);
  });

  it('supports exam completed and score threshold candidates', () => {
    expect(
      resolveEventPointSourceCandidates(
        baseEvent({
          eventType: REWARD_EVENT_TYPES.ExamCompleted,
          metadata: { scorePercent: 85 },
        }),
      ),
    ).toEqual([PointSourceType.ExamCompleted, PointSourceType.ExamScoreThreshold]);
  });

  it('evaluates score threshold condition', () => {
    const condition = parseExamScoreThresholdCondition('{"minScorePercent":80}');
    expect(condition).toEqual({ minScorePercent: 80 });

    const rule = baseRule({
      eventType: REWARD_EVENT_TYPES.ExamCompleted,
      sourceType: PointSourceType.ExamScoreThreshold,
      conditionConfigJson: '{"minScorePercent":80}',
    });
    expect(
      doesRuleMatchEvent(
        rule,
        baseEvent({
          eventType: REWARD_EVENT_TYPES.ExamCompleted,
          metadata: { scorePercent: 79 },
        }),
      ),
    ).toBe(false);
    expect(
      doesRuleMatchEvent(
        rule,
        baseEvent({
          eventType: REWARD_EVENT_TYPES.ExamCompleted,
          metadata: { scorePercent: 80 },
        }),
      ),
    ).toBe(true);
  });
});
