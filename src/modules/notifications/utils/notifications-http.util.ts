import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DuplicateNotificationError,
  InvalidNotificationDeviceProviderError,
  InvalidNotificationDeviceTokenError,
  InvalidNotificationTargetError,
  NotificationAccessDeniedError,
  NotificationDeviceNotFoundError,
  NotificationEventIdentityConflictError,
  NotificationNotFoundError,
  NotificationRecipientNotFoundError,
} from '../errors/notification.errors';

export function rethrowNotificationServiceError(error: unknown): never {
  if (error instanceof NotificationAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof NotificationNotFoundError ||
    error instanceof NotificationDeviceNotFoundError ||
    error instanceof NotificationRecipientNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof InvalidNotificationDeviceProviderError ||
    error instanceof InvalidNotificationDeviceTokenError ||
    error instanceof InvalidNotificationTargetError
  ) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof DuplicateNotificationError ||
    error instanceof NotificationEventIdentityConflictError
  ) {
    throw new ConflictException(error.message);
  }

  throw error;
}
