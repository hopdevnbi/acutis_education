/**
 * Stable communication application event type constants.
 * Modules (Announcements, Events) emit these; Notifications ingests them (#002+).
 */
export const COMMUNICATION_EVENT_TYPES = {
  AnnouncementPublished: 'ANNOUNCEMENT_PUBLISHED',
  EventPublished: 'EVENT_PUBLISHED',
  EventUpdated: 'EVENT_UPDATED',
  EventCancelled: 'EVENT_CANCELLED',
} as const;

export type CommunicationEventType =
  (typeof COMMUNICATION_EVENT_TYPES)[keyof typeof COMMUNICATION_EVENT_TYPES];

export const COMMUNICATION_EVENT_TYPE_VALUES: readonly CommunicationEventType[] =
  Object.values(COMMUNICATION_EVENT_TYPES);

export type CommunicationTargetType = 'GLOBAL' | 'PARISH' | 'CLASS' | 'ROLE';

/**
 * Extraction-safe audience target snapshot (no PII: no names, emails, phone numbers).
 */
export interface CommunicationTargetDescriptor {
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}

/**
 * Base for all community communication events.
 * Carries applicationEventId (trace instance identity) and operationKey (deterministic logical dedupe key).
 */
export interface CommunicationApplicationEventBase {
  readonly applicationEventId: string;
  readonly operationKey: string;
  readonly eventType: CommunicationEventType;
  readonly occurredAt: Date;
}

export interface AnnouncementPublishedEvent extends CommunicationApplicationEventBase {
  readonly eventType: typeof COMMUNICATION_EVENT_TYPES.AnnouncementPublished;
  readonly announcementId: string;
  readonly title: string;
  readonly snippet: string;
  readonly priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly publishedAt: Date;
}

export interface EventPublishedEvent extends CommunicationApplicationEventBase {
  readonly eventType: typeof COMMUNICATION_EVENT_TYPES.EventPublished;
  readonly eventId: string;
  readonly title: string;
  readonly snippet: string;
  readonly startsAt: Date;
  readonly venueName: string | null;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly publishedAt: Date;
}

export interface EventUpdatedEvent extends CommunicationApplicationEventBase {
  readonly eventType: typeof COMMUNICATION_EVENT_TYPES.EventUpdated;
  readonly eventId: string;
  readonly version: number;
  readonly title: string;
  readonly changeSummary: string;
  readonly startsAt: Date;
  readonly venueName: string | null;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly registeredRecipientUserIds: readonly string[];
  readonly updatedAt: Date;
}

export interface EventCancelledEvent extends CommunicationApplicationEventBase {
  readonly eventType: typeof COMMUNICATION_EVENT_TYPES.EventCancelled;
  readonly eventId: string;
  readonly title: string;
  readonly cancellationSummary: string;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly registeredRecipientUserIds: readonly string[];
  readonly cancelledAt: Date;
}

export type CommunicationApplicationEvent =
  | AnnouncementPublishedEvent
  | EventPublishedEvent
  | EventUpdatedEvent
  | EventCancelledEvent;
