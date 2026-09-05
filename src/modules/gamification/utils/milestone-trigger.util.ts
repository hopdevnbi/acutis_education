import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { MILESTONE_TRIGGER_TYPES, MilestoneTriggerType } from '../enums/gamification.enums';
import { InvalidMilestoneTriggerConfigError } from '../errors/gamification.errors';

export interface MilestoneTriggerMinCountConfig {
  readonly minCount: number;
}

const MIN_COUNT_MIN = 1;
const MIN_COUNT_MAX = 10_000;

export function isMilestoneTriggerType(value: string): value is MilestoneTriggerType {
  return (MILESTONE_TRIGGER_TYPES as readonly string[]).includes(value);
}

function normalizeTriggerConfigJson(triggerConfigJson: string | null): string | null {
  if (triggerConfigJson === null) {
    return null;
  }
  const trimmed = triggerConfigJson.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseObjectConfig(triggerConfigJson: string | null): Record<string, unknown> | null {
  const normalized = normalizeTriggerConfigJson(triggerConfigJson);
  if (normalized === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized) as unknown;
  } catch {
    throw new InvalidMilestoneTriggerConfigError('trigger_config_json is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidMilestoneTriggerConfigError('trigger_config_json must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function assertEmptyOrNullConfig(
  triggerType: MilestoneTriggerType,
  record: Record<string, unknown> | null,
): null {
  if (record === null) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  throw new InvalidMilestoneTriggerConfigError(
    `${triggerType} does not accept trigger config keys; use null, empty string, or {}.`,
  );
}

function parseMinCountConfig(record: Record<string, unknown> | null): MilestoneTriggerMinCountConfig {
  if (record === null) {
    throw new InvalidMilestoneTriggerConfigError('minCount config is required.');
  }
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'minCount') {
    throw new InvalidMilestoneTriggerConfigError(
      'Count triggers require exactly { "minCount": number }.',
    );
  }
  const minCount = record.minCount;
  if (
    typeof minCount !== 'number' ||
    !Number.isInteger(minCount) ||
    minCount < MIN_COUNT_MIN ||
    minCount > MIN_COUNT_MAX
  ) {
    throw new InvalidMilestoneTriggerConfigError(
      `minCount must be an integer between ${MIN_COUNT_MIN} and ${MIN_COUNT_MAX}.`,
    );
  }
  return { minCount };
}

/**
 * Validates typed milestone trigger_config_json for the given trigger type.
 * FIRST_* triggers accept null/empty/`{}` and return null.
 */
export function parseAndValidateMilestoneTriggerConfig(
  triggerType: MilestoneTriggerType,
  triggerConfigJson: string | null,
): MilestoneTriggerMinCountConfig | null {
  const record = parseObjectConfig(triggerConfigJson);

  switch (triggerType) {
    case MilestoneTriggerType.FirstLessonCompleted:
    case MilestoneTriggerType.FirstExamCompleted:
    case MilestoneTriggerType.FirstMissionCompleted:
      return assertEmptyOrNullConfig(triggerType, record);
    case MilestoneTriggerType.LessonsCompletedCount:
    case MilestoneTriggerType.AttendanceCount:
      return parseMinCountConfig(record);
    default: {
      const _exhaustive: never = triggerType;
      throw new InvalidMilestoneTriggerConfigError(
        `Unsupported milestone trigger type: ${String(_exhaustive)}`,
      );
    }
  }
}

/**
 * Maps milestone trigger types to reward event types.
 * FIRST_MISSION_COMPLETED has no reward event mapping in #004 (returns null).
 */
export function milestoneTriggerToRewardEventType(
  triggerType: MilestoneTriggerType,
): string | null {
  switch (triggerType) {
    case MilestoneTriggerType.FirstLessonCompleted:
    case MilestoneTriggerType.LessonsCompletedCount:
      return REWARD_EVENT_TYPES.LearningLessonCompleted;
    case MilestoneTriggerType.AttendanceCount:
      return REWARD_EVENT_TYPES.AttendanceSessionCompletedMark;
    case MilestoneTriggerType.FirstExamCompleted:
      return REWARD_EVENT_TYPES.ExamCompleted;
    case MilestoneTriggerType.FirstMissionCompleted:
      return null;
    default: {
      const _exhaustive: never = triggerType;
      throw new InvalidMilestoneTriggerConfigError(
        `Unsupported milestone trigger type: ${String(_exhaustive)}`,
      );
    }
  }
}

export function doesMilestoneTriggerMatchEvent(input: {
  readonly triggerType: MilestoneTriggerType;
  readonly triggerConfigJson: string | null;
  readonly event: RewardEligibleEvent;
  readonly eventCountForMappedType: number;
}): boolean {
  switch (input.triggerType) {
    // Missions emit completion in #005; never match in #004.
    case MilestoneTriggerType.FirstMissionCompleted:
      return false;
    case MilestoneTriggerType.FirstLessonCompleted:
    case MilestoneTriggerType.FirstExamCompleted: {
      const mappedEventType = milestoneTriggerToRewardEventType(input.triggerType);
      return (
        mappedEventType !== null &&
        input.event.eventType === mappedEventType &&
        input.eventCountForMappedType >= 1
      );
    }
    case MilestoneTriggerType.LessonsCompletedCount:
    case MilestoneTriggerType.AttendanceCount: {
      const mappedEventType = milestoneTriggerToRewardEventType(input.triggerType);
      if (mappedEventType === null || input.event.eventType !== mappedEventType) {
        return false;
      }
      const config = parseAndValidateMilestoneTriggerConfig(
        input.triggerType,
        input.triggerConfigJson,
      );
      if (config === null) {
        return false;
      }
      return input.eventCountForMappedType >= config.minCount;
    }
    default: {
      const _exhaustive: never = input.triggerType;
      return _exhaustive;
    }
  }
}
