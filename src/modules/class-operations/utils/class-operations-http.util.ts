import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClassNotFoundError, InvalidClassIdError } from '../../class/errors/class.errors';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  AttendanceAlreadyFinalizedError,
  AttendanceEnrollmentNotInSessionRosterError,
  ClassOperationsAccessDeniedError,
  ClassSessionClassNotActiveError,
  ClassSessionNotEditableError,
  ClassSessionNotFoundError,
  ClassSessionRosterImmutableError,
  ClassSessionUpdateRequiresFieldsError,
  DuplicateAttendanceEnrollmentInputError,
  InvalidAttendanceNoteError,
  InvalidAttendanceStatusError,
  InvalidClassSessionIdError,
  InvalidClassSessionTimeRangeError,
  InvalidClassSessionTransitionError,
} from '../errors/class-operations.errors';

export function rethrowClassOperationsServiceError(error: unknown): never {
  if (
    error instanceof ClassOperationsAccessDeniedError ||
    error instanceof ClassScopeAccessDeniedError ||
    error instanceof ParishScopeAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof ClassSessionNotFoundError || error instanceof ClassNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof ClassSessionNotEditableError ||
    error instanceof InvalidClassSessionTransitionError ||
    error instanceof AttendanceAlreadyFinalizedError ||
    error instanceof ClassSessionRosterImmutableError
  ) {
    throw new ConflictException(error.message);
  }

  if (error instanceof AttendanceEnrollmentNotInSessionRosterError) {
    throw new UnprocessableEntityException(error.message);
  }

  if (
    error instanceof InvalidClassSessionIdError ||
    error instanceof InvalidClassIdError ||
    error instanceof InvalidClassSessionTimeRangeError ||
    error instanceof InvalidAttendanceStatusError ||
    error instanceof InvalidAttendanceNoteError ||
    error instanceof DuplicateAttendanceEnrollmentInputError ||
    error instanceof ClassSessionClassNotActiveError ||
    error instanceof ClassSessionUpdateRequiresFieldsError
  ) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
