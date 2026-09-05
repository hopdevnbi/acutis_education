import { EventStatus } from '../enums/event.enums';
import {
  EventAlreadyArchivedError,
  EventAlreadyCancelledError,
  EventAlreadyCompletedError,
  EventAlreadyPublishedError,
  EventNotEditableError,
  InvalidEventScopeError,
  InvalidEventTransitionError,
} from '../errors/event.errors';

export const VALID_EVENT_TRANSITIONS: Readonly<
  Record<EventStatus, readonly EventStatus[]>
> = {
  [EventStatus.Draft]: [
    EventStatus.Draft,
    EventStatus.Published,
    EventStatus.Archived,
  ],
  [EventStatus.Published]: [
    EventStatus.Published,
    EventStatus.Cancelled,
    EventStatus.Completed,
  ],
  [EventStatus.Cancelled]: [
    EventStatus.Cancelled,
    EventStatus.Archived,
  ],
  [EventStatus.Completed]: [
    EventStatus.Completed,
    EventStatus.Archived,
  ],
  [EventStatus.Archived]: [],
};

export function isValidEventTransition(
  currentStatus: EventStatus,
  targetStatus: EventStatus,
): boolean {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = VALID_EVENT_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function assertValidEventTransition(
  currentStatus: EventStatus,
  targetStatus: EventStatus,
): void {
  if (currentStatus === targetStatus) {
    if (currentStatus === EventStatus.Published) {
      throw new EventAlreadyPublishedError();
    }
    if (currentStatus === EventStatus.Cancelled) {
      throw new EventAlreadyCancelledError();
    }
    if (currentStatus === EventStatus.Completed) {
      throw new EventAlreadyCompletedError();
    }
    if (currentStatus === EventStatus.Archived) {
      throw new EventAlreadyArchivedError();
    }
    return;
  }

  if (!isValidEventTransition(currentStatus, targetStatus)) {
    throw new InvalidEventTransitionError(
      `Cannot transition event from ${currentStatus} to ${targetStatus}.`,
    );
  }
}

export function validateEventTimeWindow(
  startsAt: Date,
  endsAt: Date,
  registrationDeadline?: Date | null,
): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new InvalidEventScopeError('Event endsAt must be strictly after startsAt.');
  }

  if (registrationDeadline) {
    if (registrationDeadline.getTime() >= startsAt.getTime()) {
      throw new InvalidEventScopeError(
        'Event registrationDeadline must be strictly before startsAt.',
      );
    }
  }
}

export function assertEventFieldsEditable(
  currentStatus: EventStatus,
  attemptedFields: readonly string[],
): void {
  if (
    currentStatus === EventStatus.Archived ||
    currentStatus === EventStatus.Cancelled ||
    currentStatus === EventStatus.Completed
  ) {
    throw new EventNotEditableError(
      `Event in status ${currentStatus} is read-only and cannot be updated.`,
    );
  }

  if (currentStatus === EventStatus.Published) {
    const immutableFieldsInPublished = [
      'scopeType',
      'parishId',
      'classId',
      'code',
      'targets',
    ];
    const violated = attemptedFields.find((f) => immutableFieldsInPublished.includes(f));
    if (violated) {
      throw new EventNotEditableError(
        `Field '${violated}' cannot be modified once an event is PUBLISHED.`,
      );
    }
  }
}

export type EventSignificantChangeType = 'DATE_TIME' | 'VENUE' | 'CAPACITY';

export interface EventChangeDetectionInput {
  readonly current: {
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly timezone: string;
    readonly venueName: string | null;
    readonly address: string | null;
    readonly capacity: number | null;
  };
  readonly updated: {
    readonly startsAt?: Date;
    readonly endsAt?: Date;
    readonly timezone?: string;
    readonly venueName?: string | null;
    readonly address?: string | null;
    readonly capacity?: number | null;
  };
}

export function detectEventSignificantChanges(
  input: EventChangeDetectionInput,
): EventSignificantChangeType[] {
  const changes: EventSignificantChangeType[] = [];

  const dateTimeChanged =
    (input.updated.startsAt !== undefined &&
      input.updated.startsAt.getTime() !== input.current.startsAt.getTime()) ||
    (input.updated.endsAt !== undefined &&
      input.updated.endsAt.getTime() !== input.current.endsAt.getTime()) ||
    (input.updated.timezone !== undefined &&
      input.updated.timezone !== input.current.timezone);

  if (dateTimeChanged) {
    changes.push('DATE_TIME');
  }

  const venueChanged =
    (input.updated.venueName !== undefined &&
      input.updated.venueName !== input.current.venueName) ||
    (input.updated.address !== undefined &&
      input.updated.address !== input.current.address);

  if (venueChanged) {
    changes.push('VENUE');
  }

  const capacityChanged =
    input.updated.capacity !== undefined &&
    input.updated.capacity !== input.current.capacity;

  if (capacityChanged) {
    changes.push('CAPACITY');
  }

  return changes;
}
