import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CommunicationTargetType, EventScopeType } from '../enums/event.enums';
import {
  InvalidEventRegistrationError,
  InvalidEventScopeError,
} from '../errors/event.errors';

export function buildEventScopeKey(input: {
  readonly scopeType: EventScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
}): string {
  switch (input.scopeType) {
    case EventScopeType.Global:
      if (input.parishId || input.classId) {
        throw new InvalidEventScopeError('Global events must not set parishId or classId.');
      }
      return 'GLOBAL';

    case EventScopeType.Parish:
      if (!input.parishId) {
        throw new InvalidEventScopeError('Parish events must specify parishId.');
      }
      return `PARISH:${normalizeUuid(input.parishId)}`;

    case EventScopeType.Class:
      if (!input.classId) {
        throw new InvalidEventScopeError('Class events must specify classId.');
      }
      return `CLASS:${normalizeUuid(input.classId)}`;

    default:
      throw new InvalidEventScopeError('Unknown event scope type.');
  }
}

export function buildEventTargetKey(input: {
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}): string {
  switch (input.targetType) {
    case CommunicationTargetType.Global:
      if (input.parishId || input.classId || input.roleCode) {
        throw new InvalidEventScopeError('Global targets must not set parish, class, or role.');
      }
      return 'GLOBAL';

    case CommunicationTargetType.Parish:
      if (!input.parishId) {
        throw new InvalidEventScopeError('Parish targets must specify parishId.');
      }
      return `PARISH:${normalizeUuid(input.parishId)}`;

    case CommunicationTargetType.Class:
      if (!input.classId) {
        throw new InvalidEventScopeError('Class targets must specify classId.');
      }
      return `CLASS:${normalizeUuid(input.classId)}`;

    case CommunicationTargetType.Role:
      if (!input.roleCode || input.roleCode.trim().length === 0) {
        throw new InvalidEventScopeError('Role targets must specify a non-empty roleCode.');
      }
      if (!input.parishId) {
        throw new InvalidEventScopeError('Role targets in MVP require parishId scoping.');
      }
      return `ROLE:${normalizeUuid(input.parishId)}:${input.roleCode.trim().toUpperCase()}`;

    default:
      throw new InvalidEventScopeError('Unknown communication target type.');
  }
}

export function buildEventRegistrantKey(input: {
  readonly userId: string;
  readonly studentId?: string | null;
}): string {
  if (!input.userId) {
    throw new InvalidEventRegistrationError('User ID is required for registration.');
  }

  if (input.studentId) {
    return `STUDENT:${normalizeUuid(input.studentId)}`;
  }

  return `USER:${normalizeUuid(input.userId)}`;
}

export function buildEventOperationKey(input: {
  readonly eventType: 'EVENT_PUBLISHED' | 'EVENT_UPDATED' | 'EVENT_CANCELLED';
  readonly eventId: string;
  readonly version?: number;
}): string {
  const eventId = normalizeUuid(input.eventId);
  switch (input.eventType) {
    case 'EVENT_PUBLISHED':
      return `EVENT_PUBLISHED:${eventId}`;
    case 'EVENT_UPDATED': {
      const v = input.version !== undefined ? Math.max(1, input.version) : 1;
      return `EVENT_UPDATED:${eventId}:v${v}`;
    }
    case 'EVENT_CANCELLED':
      return `EVENT_CANCELLED:${eventId}`;
    default:
      throw new Error(`Unknown event operation type: ${input.eventType}`);
  }
}

export function normalizeEventCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}
