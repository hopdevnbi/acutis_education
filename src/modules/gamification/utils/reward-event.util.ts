import {
  REWARD_EVENT_METADATA_ALLOWED_KEYS,
  type RewardEligibleEvent,
  type RewardEventMetadata,
} from '../../application-events/contracts/reward-eligible-event.contract';
import { InvalidRewardEventMetadataError } from '../errors/gamification.errors';

const ALLOWED_METADATA_KEY_SET = new Set<string>(REWARD_EVENT_METADATA_ALLOWED_KEYS);

const DISALLOWED_PII_KEYS = new Set([
  'name',
  'fullName',
  'email',
  'note',
  'staffNote',
  'phone',
  'address',
]);

export function assertRewardEventMetadata(
  metadata: RewardEventMetadata | Record<string, unknown> | undefined,
): void {
  if (!metadata) {
    return;
  }

  for (const key of Object.keys(metadata)) {
    if (DISALLOWED_PII_KEYS.has(key) || !ALLOWED_METADATA_KEY_SET.has(key)) {
      throw new InvalidRewardEventMetadataError(`Disallowed metadata key: ${key}`);
    }
  }
}

export function assertRewardEligibleEventShape(event: RewardEligibleEvent): void {
  if (!event.eventId || !event.eventType || !event.studentId || !event.parishId || !event.sourceId) {
    throw new Error('RewardEligibleEvent is missing required fields.');
  }
  if (!(event.occurredAt instanceof Date) || Number.isNaN(event.occurredAt.getTime())) {
    throw new Error('RewardEligibleEvent.occurredAt must be a valid Date.');
  }
  assertRewardEventMetadata(event.metadata);
}

export function isBadgeAwardActive(revokedAt: Date | null): boolean {
  return revokedAt == null;
}
