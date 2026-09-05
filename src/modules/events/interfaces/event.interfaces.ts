import type {
  CommunicationTargetType,
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';

export interface EventSnapshot {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly summary: string | null;
  readonly locale: string;
  readonly scopeType: EventScopeType;
  readonly scopeKey: string;
  readonly parishId: string | null;
  readonly classId: string | null;
  readonly status: EventStatus;
  readonly timezone: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly venueName: string | null;
  readonly address: string | null;
  readonly coverMediaAssetId: string | null;
  readonly capacity: number | null;
  readonly isRegistrationRequired: boolean;
  readonly registrationDeadline: Date | null;
  readonly publishedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly version: number;
  readonly createdByUserId: string;
  readonly updatedByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EventTargetSnapshot {
  readonly id: string;
  readonly eventId: string;
  readonly targetType: CommunicationTargetType;
  readonly parishId: string | null;
  readonly classId: string | null;
  readonly roleCode: string | null;
  readonly targetKey: string;
  readonly createdAt: Date;
}

export interface EventRegistrationSnapshot {
  readonly id: string;
  readonly eventId: string;
  readonly registrantKey: string;
  readonly userId: string;
  readonly studentId: string | null;
  readonly enrollmentId: string | null;
  readonly status: EventRegistrationStatus;
  readonly registeredAt: Date;
  readonly cancelledAt: Date | null;
  readonly checkedInAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateEventInput {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly summary?: string | null;
  readonly locale?: string;
  readonly scopeType: EventScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly timezone?: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly venueName?: string | null;
  readonly address?: string | null;
  readonly coverMediaAssetId?: string | null;
  readonly capacity?: number | null;
  readonly isRegistrationRequired?: boolean;
  readonly registrationDeadline?: Date | null;
  readonly authorUserId: string;
}

export interface UpdateEventInput {
  readonly title?: string;
  readonly description?: string;
  readonly summary?: string | null;
  readonly timezone?: string;
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly venueName?: string | null;
  readonly address?: string | null;
  readonly coverMediaAssetId?: string | null;
  readonly capacity?: number | null;
  readonly isRegistrationRequired?: boolean;
  readonly registrationDeadline?: Date | null;
  readonly updatedByUserId: string;
}

export interface CreateEventTargetInput {
  readonly eventId: string;
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}

export interface CreateEventRegistrationInput {
  readonly eventId: string;
  readonly userId: string;
  readonly studentId?: string | null;
  readonly enrollmentId?: string | null;
}
