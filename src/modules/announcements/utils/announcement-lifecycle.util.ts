import { AnnouncementStatus } from '../enums/announcement.enums';
import {
  AnnouncementAlreadyArchivedError,
  AnnouncementAlreadyPublishedError,
  AnnouncementNotEditableError,
  InvalidAnnouncementScheduleError,
  InvalidAnnouncementTransitionError,
} from '../errors/announcement.errors';

export const VALID_ANNOUNCEMENT_TRANSITIONS: Readonly<
  Record<AnnouncementStatus, readonly AnnouncementStatus[]>
> = {
  [AnnouncementStatus.Draft]: [
    AnnouncementStatus.Draft,
    AnnouncementStatus.Published,
    AnnouncementStatus.Archived,
  ],
  [AnnouncementStatus.Published]: [
    AnnouncementStatus.Published,
    AnnouncementStatus.Archived,
  ],
  [AnnouncementStatus.Archived]: [],
};

export function isValidAnnouncementTransition(
  currentStatus: AnnouncementStatus,
  targetStatus: AnnouncementStatus,
): boolean {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = VALID_ANNOUNCEMENT_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function assertValidAnnouncementTransition(
  currentStatus: AnnouncementStatus,
  targetStatus: AnnouncementStatus,
): void {
  if (currentStatus === targetStatus) {
    if (currentStatus === AnnouncementStatus.Published) {
      throw new AnnouncementAlreadyPublishedError();
    }
    if (currentStatus === AnnouncementStatus.Archived) {
      throw new AnnouncementAlreadyArchivedError();
    }
    return;
  }

  if (!isValidAnnouncementTransition(currentStatus, targetStatus)) {
    throw new InvalidAnnouncementTransitionError(
      `Cannot transition announcement from ${currentStatus} to ${targetStatus}.`,
    );
  }
}

export function validateAnnouncementTimeWindow(startsAt?: Date | null, endsAt?: Date | null): void {
  if (startsAt && endsAt) {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new InvalidAnnouncementScheduleError('endsAt must be after startsAt.');
    }
  }
}

/**
 * Validates which fields may be mutated given the current status:
 * - DRAFT: all fields mutable
 * - PUBLISHED: only editorial/window fields (title, body, summary, priority, startsAt, endsAt, isPinned, coverMediaAssetId, locale).
 *   scopeType, parishId, and targets are strictly immutable!
 * - ARCHIVED: read-only (no mutations allowed).
 */
export function assertAnnouncementFieldsEditable(
  currentStatus: AnnouncementStatus,
  attemptedFields: readonly string[],
): void {
  if (currentStatus === AnnouncementStatus.Archived) {
    throw new AnnouncementNotEditableError('Archived announcements cannot be modified.');
  }

  if (currentStatus === AnnouncementStatus.Published) {
    const immutableFieldsInPublished = ['scopeType', 'parishId', 'targets'];
    const violated = attemptedFields.find((f) => immutableFieldsInPublished.includes(f));
    if (violated) {
      throw new AnnouncementNotEditableError(
        `Field '${violated}' cannot be modified once an announcement is PUBLISHED.`,
      );
    }
  }
}
