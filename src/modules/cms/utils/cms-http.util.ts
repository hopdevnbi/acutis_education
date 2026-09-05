import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CmsAccessDeniedError,
  CmsEntryNotEditableError,
  CmsEntryNotFoundError,
  CmsScopeAccessDeniedError,
  CmsSlugConflictError,
  InvalidCmsLifecycleTransitionError,
  InvalidCmsScheduleError,
  InvalidCmsScopeError,
  InvalidCmsSlugError,
  InvalidCmsTransitionError,
} from '../errors/cms.errors';

export function rethrowCmsServiceError(error: unknown): never {
  if (
    error instanceof CmsAccessDeniedError ||
    error instanceof CmsScopeAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof CmsEntryNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof CmsSlugConflictError ||
    error instanceof CmsEntryNotEditableError ||
    error instanceof InvalidCmsTransitionError ||
    error instanceof InvalidCmsLifecycleTransitionError
  ) {
    throw new ConflictException(error.message);
  }

  if (
    error instanceof InvalidCmsScopeError ||
    error instanceof InvalidCmsScheduleError ||
    error instanceof InvalidCmsSlugError
  ) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unexpected CMS service error occurred.');
}
