import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnouncementAccessDeniedError,
  AnnouncementAlreadyArchivedError,
  AnnouncementAlreadyPublishedError,
  AnnouncementNotEditableError,
  AnnouncementNotFoundError,
  AnnouncementTargetNotAllowedError,
  InvalidAnnouncementScheduleError,
  InvalidAnnouncementTargetError,
  InvalidAnnouncementTransitionError,
} from '../errors/announcement.errors';

export function rethrowAnnouncementServiceError(error: unknown): never {
  if (
    error instanceof AnnouncementAccessDeniedError ||
    error instanceof AnnouncementTargetNotAllowedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof AnnouncementNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof AnnouncementAlreadyPublishedError ||
    error instanceof AnnouncementAlreadyArchivedError ||
    error instanceof AnnouncementNotEditableError ||
    error instanceof InvalidAnnouncementTransitionError
  ) {
    throw new ConflictException(error.message);
  }

  if (
    error instanceof InvalidAnnouncementTargetError ||
    error instanceof InvalidAnnouncementScheduleError
  ) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unexpected announcement service error occurred.');
}
