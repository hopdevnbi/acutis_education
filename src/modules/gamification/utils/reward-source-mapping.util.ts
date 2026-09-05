import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { PointSourceType } from '../enums/gamification.enums';
import { RewardRuleConfigurationError } from '../errors/gamification.errors';
import type { RewardRuleSnapshot } from '../interfaces/gamification.interfaces';

export interface ExamScoreThresholdCondition {
  readonly minScorePercent: number;
}

/**
 * Maps reward events to ledger source types for rule evaluation.
 * Attendance ABSENT/EXCUSED return null (no automatic points).
 */
export function resolveEventPointSourceCandidates(
  event: RewardEligibleEvent,
): readonly PointSourceType[] {
  switch (event.eventType) {
    case REWARD_EVENT_TYPES.LearningLessonCompleted:
      return [PointSourceType.LessonCompleted];
    case REWARD_EVENT_TYPES.PracticeCompleted:
      return [PointSourceType.PracticeCompleted];
    case REWARD_EVENT_TYPES.ExamCompleted: {
      const candidates: PointSourceType[] = [PointSourceType.ExamCompleted];
      const scorePercent = event.metadata?.scorePercent;
      if (typeof scorePercent === 'number') {
        candidates.push(PointSourceType.ExamScoreThreshold);
      }
      return candidates;
    }
    case REWARD_EVENT_TYPES.AttendanceSessionCompletedMark: {
      const status = String(event.metadata?.attendanceStatus ?? '').toUpperCase();
      if (status === 'PRESENT') {
        return [PointSourceType.AttendancePresent];
      }
      if (status === 'LATE') {
        return [PointSourceType.AttendanceLate];
      }
      return [];
    }
    default:
      return [];
  }
}

export function parseExamScoreThresholdCondition(
  conditionConfigJson: string | null,
): ExamScoreThresholdCondition | null {
  if (!conditionConfigJson) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(conditionConfigJson) as unknown;
  } catch {
    throw new RewardRuleConfigurationError('condition_config_json is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RewardRuleConfigurationError('condition_config_json must be an object.');
  }
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'minScorePercent') {
    throw new RewardRuleConfigurationError(
      'EXAM_SCORE_THRESHOLD condition supports only { "minScorePercent": number }.',
    );
  }
  const minScorePercent = record.minScorePercent;
  if (
    typeof minScorePercent !== 'number' ||
    !Number.isFinite(minScorePercent) ||
    minScorePercent < 0 ||
    minScorePercent > 100
  ) {
    throw new RewardRuleConfigurationError('minScorePercent must be a number between 0 and 100.');
  }
  return { minScorePercent };
}

/**
 * Effective window convention: effectiveFrom <= occurredAt AND occurredAt < effectiveTo
 * (exclusive end). Missing bounds are open-ended.
 */
export function doesRuleMatchEvent(
  rule: RewardRuleSnapshot,
  event: RewardEligibleEvent,
): boolean {
  const candidates = resolveEventPointSourceCandidates(event);
  if (!candidates.includes(rule.sourceType as PointSourceType)) {
    return false;
  }

  if (rule.sourceType === PointSourceType.ExamScoreThreshold) {
    const condition = parseExamScoreThresholdCondition(rule.conditionConfigJson);
    if (!condition) {
      return false;
    }
    const scorePercent = event.metadata?.scorePercent;
    if (typeof scorePercent !== 'number' || scorePercent < condition.minScorePercent) {
      return false;
    }
  }

  return true;
}

export function assertConditionConfigForRule(input: {
  readonly sourceType: string;
  readonly conditionConfigJson?: string | null;
}): string | null {
  const json = input.conditionConfigJson ?? null;
  if (input.sourceType === PointSourceType.ExamScoreThreshold) {
    parseExamScoreThresholdCondition(json);
    return json;
  }
  if (json) {
    throw new RewardRuleConfigurationError(
      'condition_config_json is only supported for EXAM_SCORE_THRESHOLD sourceType.',
    );
  }
  return null;
}
