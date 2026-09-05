import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { BADGE_RULE_TYPES, BadgeRuleType } from '../enums/gamification.enums';
import { InvalidBadgeRuleConfigError } from '../errors/gamification.errors';

export interface BadgeRuleMinCountConfig {
  readonly minCount: number;
}

export interface BadgeRuleMinScoreConfig {
  readonly minScorePercent: number;
}

const MIN_COUNT_MIN = 1;
const MIN_COUNT_MAX = 10_000;
const MIN_SCORE_PERCENT_MIN = 0;
const MIN_SCORE_PERCENT_MAX = 100;

export function isBadgeRuleType(value: string): value is BadgeRuleType {
  return (BADGE_RULE_TYPES as readonly string[]).includes(value);
}

function normalizeRuleConfigJson(ruleConfigJson: string | null): string | null {
  if (ruleConfigJson === null) {
    return null;
  }
  const trimmed = ruleConfigJson.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseObjectConfig(ruleConfigJson: string | null): Record<string, unknown> | null {
  const normalized = normalizeRuleConfigJson(ruleConfigJson);
  if (normalized === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized) as unknown;
  } catch {
    throw new InvalidBadgeRuleConfigError('rule_config_json is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidBadgeRuleConfigError('rule_config_json must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function assertEmptyOrNullConfig(ruleType: BadgeRuleType, record: Record<string, unknown> | null): null {
  if (record === null) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  throw new InvalidBadgeRuleConfigError(
    `${ruleType} does not accept rule config keys; use null, empty string, or {}.`,
  );
}

function parseMinCountConfig(record: Record<string, unknown> | null): BadgeRuleMinCountConfig {
  if (record === null) {
    throw new InvalidBadgeRuleConfigError('minCount config is required.');
  }
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'minCount') {
    throw new InvalidBadgeRuleConfigError('Count rules require exactly { "minCount": number }.');
  }
  const minCount = record.minCount;
  if (
    typeof minCount !== 'number' ||
    !Number.isInteger(minCount) ||
    minCount < MIN_COUNT_MIN ||
    minCount > MIN_COUNT_MAX
  ) {
    throw new InvalidBadgeRuleConfigError(
      `minCount must be an integer between ${MIN_COUNT_MIN} and ${MIN_COUNT_MAX}.`,
    );
  }
  return { minCount };
}

function parseMinScoreConfig(record: Record<string, unknown> | null): BadgeRuleMinScoreConfig {
  if (record === null) {
    throw new InvalidBadgeRuleConfigError('minScorePercent config is required.');
  }
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'minScorePercent') {
    throw new InvalidBadgeRuleConfigError(
      'EXAM_SCORE_THRESHOLD requires exactly { "minScorePercent": number }.',
    );
  }
  const minScorePercent = record.minScorePercent;
  if (
    typeof minScorePercent !== 'number' ||
    !Number.isFinite(minScorePercent) ||
    minScorePercent < MIN_SCORE_PERCENT_MIN ||
    minScorePercent > MIN_SCORE_PERCENT_MAX
  ) {
    throw new InvalidBadgeRuleConfigError(
      `minScorePercent must be a number between ${MIN_SCORE_PERCENT_MIN} and ${MIN_SCORE_PERCENT_MAX}.`,
    );
  }
  return { minScorePercent };
}

/**
 * Validates typed badge rule_config_json for the given rule type.
 * FIRST_* rules accept null/empty/`{}` and return null.
 */
export function parseAndValidateBadgeRuleConfig(
  ruleType: BadgeRuleType,
  ruleConfigJson: string | null,
): BadgeRuleMinCountConfig | BadgeRuleMinScoreConfig | null {
  const record = parseObjectConfig(ruleConfigJson);

  switch (ruleType) {
    case BadgeRuleType.FirstLessonCompleted:
    case BadgeRuleType.FirstExamCompleted:
      return assertEmptyOrNullConfig(ruleType, record);
    case BadgeRuleType.LessonsCompletedCount:
    case BadgeRuleType.PracticeCompletedCount:
    case BadgeRuleType.AttendancePresentOrLateCount:
      return parseMinCountConfig(record);
    case BadgeRuleType.ExamScoreThreshold:
      return parseMinScoreConfig(record);
    default: {
      const _exhaustive: never = ruleType;
      throw new InvalidBadgeRuleConfigError(`Unsupported badge rule type: ${String(_exhaustive)}`);
    }
  }
}

export function badgeRuleTypeToRewardEventType(ruleType: BadgeRuleType): string {
  switch (ruleType) {
    case BadgeRuleType.FirstLessonCompleted:
    case BadgeRuleType.LessonsCompletedCount:
      return REWARD_EVENT_TYPES.LearningLessonCompleted;
    case BadgeRuleType.PracticeCompletedCount:
      return REWARD_EVENT_TYPES.PracticeCompleted;
    case BadgeRuleType.FirstExamCompleted:
    case BadgeRuleType.ExamScoreThreshold:
      return REWARD_EVENT_TYPES.ExamCompleted;
    case BadgeRuleType.AttendancePresentOrLateCount:
      return REWARD_EVENT_TYPES.AttendanceSessionCompletedMark;
    default: {
      const _exhaustive: never = ruleType;
      throw new InvalidBadgeRuleConfigError(`Unsupported badge rule type: ${String(_exhaustive)}`);
    }
  }
}

export function doesBadgeRuleMatchEvent(input: {
  readonly ruleType: BadgeRuleType;
  readonly ruleConfigJson: string | null;
  readonly event: RewardEligibleEvent;
  readonly eventCountForMappedType: number;
}): boolean {
  const mappedEventType = badgeRuleTypeToRewardEventType(input.ruleType);

  switch (input.ruleType) {
    case BadgeRuleType.FirstLessonCompleted:
    case BadgeRuleType.FirstExamCompleted:
      return (
        input.event.eventType === mappedEventType && input.eventCountForMappedType >= 1
      );
    case BadgeRuleType.LessonsCompletedCount:
    case BadgeRuleType.PracticeCompletedCount:
    case BadgeRuleType.AttendancePresentOrLateCount: {
      if (input.event.eventType !== mappedEventType) {
        return false;
      }
      const config = parseAndValidateBadgeRuleConfig(input.ruleType, input.ruleConfigJson);
      if (config === null || !('minCount' in config)) {
        return false;
      }
      return input.eventCountForMappedType >= config.minCount;
    }
    case BadgeRuleType.ExamScoreThreshold: {
      if (input.event.eventType !== REWARD_EVENT_TYPES.ExamCompleted) {
        return false;
      }
      const config = parseAndValidateBadgeRuleConfig(input.ruleType, input.ruleConfigJson);
      if (config === null || !('minScorePercent' in config)) {
        return false;
      }
      const scorePercent = input.event.metadata?.scorePercent;
      return typeof scorePercent === 'number' && scorePercent >= config.minScorePercent;
    }
    default: {
      const _exhaustive: never = input.ruleType;
      return _exhaustive;
    }
  }
}
