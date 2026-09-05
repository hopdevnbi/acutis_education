import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  EventAccessDeniedError,
  EventAlreadyArchivedError,
  EventAlreadyCancelledError,
  EventAlreadyCompletedError,
  EventAlreadyPublishedError,
  EventAlreadyRegisteredError,
  EventCapacityReachedError,
  EventCheckInNotAllowedError,
  EventCodeConflictError,
  EventNotEditableError,
  EventNotFoundError,
  EventNotRegistrableError,
  EventRegistrationCannotCancelError,
  EventRegistrationConflictError,
  EventRegistrationNotFoundError,
  EventTargetNotAllowedError,
  InvalidEventRegistrationError,
  InvalidEventScopeError,
  InvalidEventTransitionError,
} from '../errors/event.errors';

export function rethrowEventServiceError(error: unknown): never {
  if (
    error instanceof EventAccessDeniedError ||
    error instanceof EventTargetNotAllowedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof EventNotFoundError ||
    error instanceof EventRegistrationNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof EventCodeConflictError ||
    error instanceof EventAlreadyPublishedError ||
    error instanceof EventAlreadyCancelledError ||
    error instanceof EventAlreadyCompletedError ||
    error instanceof EventAlreadyArchivedError ||
    error instanceof EventNotEditableError ||
    error instanceof InvalidEventTransitionError ||
    error instanceof EventAlreadyRegisteredError ||
    error instanceof EventRegistrationConflictError ||
    error instanceof EventRegistrationCannotCancelError ||
    error instanceof EventCheckInNotAllowedError ||
    error instanceof EventCapacityReachedError
  ) {
    throw new ConflictException(error.message);
  }

  if (
    error instanceof InvalidEventScopeError ||
    error instanceof InvalidEventRegistrationError ||
    error instanceof EventNotRegistrableError
  ) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unexpected event service error occurred.');
}
