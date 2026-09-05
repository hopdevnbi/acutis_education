import { CmsEntryStatus } from '../enums/cms.enums';
import {
  CmsEntryNotEditableError,
  InvalidCmsLifecycleTransitionError,
  InvalidCmsScheduleError,
} from '../errors/cms.errors';

export const VALID_CMS_TRANSITIONS: Readonly<Record<CmsEntryStatus, readonly CmsEntryStatus[]>> = {
  [CmsEntryStatus.Draft]: [
    CmsEntryStatus.Draft,
    CmsEntryStatus.Scheduled,
    CmsEntryStatus.Published,
    CmsEntryStatus.Archived,
  ],
  [CmsEntryStatus.Scheduled]: [
    CmsEntryStatus.Scheduled,
    CmsEntryStatus.Draft,
    CmsEntryStatus.Published,
    CmsEntryStatus.Archived,
  ],
  [CmsEntryStatus.Published]: [
    CmsEntryStatus.Published,
    CmsEntryStatus.Archived,
  ],
  [CmsEntryStatus.Archived]: [],
};

export function isValidCmsTransition(
  currentStatus: CmsEntryStatus,
  targetStatus: CmsEntryStatus,
): boolean {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = VALID_CMS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function assertValidCmsTransition(
  currentStatus: CmsEntryStatus,
  targetStatus: CmsEntryStatus,
): void {
  if (!isValidCmsTransition(currentStatus, targetStatus)) {
    throw new InvalidCmsLifecycleTransitionError(
      `Cannot transition CMS entry from ${currentStatus} to ${targetStatus}.`,
    );
  }
}

export function validateCmsScheduleDates(options: {
  readonly scheduledFor?: Date | null;
  readonly expiresAt?: Date | null;
  readonly publishedAt?: Date | null;
  readonly now?: Date;
}): void {
  const now = options.now ?? new Date();

  if (options.scheduledFor) {
    if (options.scheduledFor.getTime() <= now.getTime()) {
      throw new InvalidCmsScheduleError('scheduledFor must be a future timestamp.');
    }
  }

  if (options.expiresAt) {
    const referenceStart = options.scheduledFor ?? options.publishedAt ?? now;
    if (options.expiresAt.getTime() <= referenceStart.getTime()) {
      throw new InvalidCmsScheduleError(
        'expiresAt must be after scheduledFor or publishedAt.',
      );
    }
  }
}

/**
 * Validates which fields may be mutated given the current status:
 * - DRAFT: all fields mutable
 * - SCHEDULED: title, summary, body, locale, coverMediaAssetId, isFeatured, scheduledFor, expiresAt mutable.
 *   slug, type, scopeType, parishId allowed only if never published.
 * - PUBLISHED: slug, scopeType, parishId, type are immutable!
 * - ARCHIVED: no mutations allowed (read-only).
 */
export function assertFieldsEditable(
  currentStatus: CmsEntryStatus,
  attemptedFields: readonly string[],
): void {
  if (currentStatus === CmsEntryStatus.Archived) {
    throw new CmsEntryNotEditableError('Archived CMS entries cannot be modified.');
  }

  if (currentStatus === CmsEntryStatus.Published) {
    const immutableFieldsInPublished = ['slug', 'scopeType', 'parishId', 'type'];
    const violated = attemptedFields.find((f) => immutableFieldsInPublished.includes(f));
    if (violated) {
      throw new CmsEntryNotEditableError(
        `Field '${violated}' cannot be modified once a CMS entry is PUBLISHED.`,
      );
    }
  }
}
