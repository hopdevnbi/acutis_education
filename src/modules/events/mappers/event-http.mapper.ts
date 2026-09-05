import type {
  EventAdminResponseDto,
  EventAttendeeListItemDto,
  EventDetailDto,
  EventListItemDto,
  EventRegistrationDto,
  EventTargetDto,
  MyEventRegistrationItemDto,
} from '../dto/event.dto';
import type {
  EventAttendeeSnapshot,
  EventRegistrationSnapshot,
  EventSnapshot,
  EventTargetSnapshot,
  EventWithTargetsSnapshot,
} from '../interfaces/event.interfaces';

export function toEventTargetDto(target: EventTargetSnapshot): EventTargetDto {
  return {
    id: target.id,
    targetType: target.targetType,
    parishId: target.parishId,
    classId: target.classId,
    roleCode: target.roleCode,
  };
}

export function toEventAdminResponseDto(
  item: EventWithTargetsSnapshot,
): EventAdminResponseDto {
  const { event, targets, activeRegistrationCount } = item;
  return {
    id: event.id,
    code: event.code,
    title: event.title,
    description: event.description,
    summary: event.summary,
    locale: event.locale,
    scopeType: event.scopeType,
    scopeKey: event.scopeKey,
    parishId: event.parishId,
    classId: event.classId,
    status: event.status,
    timezone: event.timezone,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    venueName: event.venueName,
    address: event.address,
    coverMediaAssetId: event.coverMediaAssetId,
    capacity: event.capacity,
    isRegistrationRequired: event.isRegistrationRequired,
    registrationDeadline: event.registrationDeadline
      ? event.registrationDeadline.toISOString()
      : null,
    publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
    cancelledAt: event.cancelledAt ? event.cancelledAt.toISOString() : null,
    cancellationReason: event.cancellationReason,
    version: event.version,
    createdByUserId: event.createdByUserId,
    updatedByUserId: event.updatedByUserId,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    targets: targets.map(toEventTargetDto),
    activeRegistrationCount,
  };
}

export function toEventListItemDto(
  event: EventSnapshot,
  isRegistered = false,
): EventListItemDto {
  return {
    id: event.id,
    code: event.code,
    title: event.title,
    summary: event.summary,
    locale: event.locale,
    scopeType: event.scopeType,
    parishId: event.parishId,
    classId: event.classId,
    status: event.status,
    timezone: event.timezone,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    venueName: event.venueName,
    address: event.address,
    coverMediaAssetId: event.coverMediaAssetId,
    capacity: event.capacity,
    isRegistrationRequired: event.isRegistrationRequired,
    registrationDeadline: event.registrationDeadline
      ? event.registrationDeadline.toISOString()
      : null,
    publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
    isRegistered,
  };
}

export function toEventRegistrationDto(
  reg: EventRegistrationSnapshot,
): EventRegistrationDto {
  return {
    id: reg.id,
    eventId: reg.eventId,
    registrantKey: reg.registrantKey,
    userId: reg.userId,
    studentId: reg.studentId,
    enrollmentId: reg.enrollmentId,
    status: reg.status,
    registeredAt: reg.registeredAt.toISOString(),
    cancelledAt: reg.cancelledAt ? reg.cancelledAt.toISOString() : null,
    checkedInAt: reg.checkedInAt ? reg.checkedInAt.toISOString() : null,
  };
}

export function toEventDetailDto(
  event: EventSnapshot,
  currentUserRegistration?: EventRegistrationSnapshot | null,
): EventDetailDto {
  const isRegistered =
    currentUserRegistration !== null &&
    currentUserRegistration !== undefined &&
    currentUserRegistration.status === 'REGISTERED';

  return {
    ...toEventListItemDto(event, isRegistered),
    description: event.description,
    currentUserRegistration: currentUserRegistration
      ? toEventRegistrationDto(currentUserRegistration)
      : null,
  };
}

export function toMyEventRegistrationItemDto(
  reg: EventRegistrationSnapshot,
  event: EventSnapshot,
): MyEventRegistrationItemDto {
  return {
    registration: toEventRegistrationDto(reg),
    event: toEventListItemDto(event, reg.status === 'REGISTERED'),
  };
}

export function toEventAttendeeListItemDto(
  attendee: EventAttendeeSnapshot,
): EventAttendeeListItemDto {
  const { registration, displayName } = attendee;
  const registrantType: 'USER' | 'STUDENT' = registration.studentId ? 'STUDENT' : 'USER';

  return {
    id: registration.id,
    eventId: registration.eventId,
    registrantKey: registration.registrantKey,
    registrantType,
    userId: registration.userId,
    studentId: registration.studentId,
    displayName,
    status: registration.status,
    registeredAt: registration.registeredAt.toISOString(),
    checkedInAt: registration.checkedInAt ? registration.checkedInAt.toISOString() : null,
    cancelledAt: registration.cancelledAt ? registration.cancelledAt.toISOString() : null,
  };
}
