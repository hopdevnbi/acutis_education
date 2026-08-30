import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassNotAcceptingEnrollmentError,
  ClassNotFoundError,
  InvalidClassIdError,
} from '../../class/errors/class.errors';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  StudentAccessDeniedError,
  StudentManageAccessDeniedError,
} from '../../student/errors/student-access.errors';
import { StudentInactiveError, StudentNotFoundError } from '../../student/errors/student.errors';
import {
  EnrollmentImmutableError,
  EnrollmentNotActiveError,
  EnrollmentNotFoundError,
  EnrollmentTargetClassMismatchError,
  EnrollmentTransferSameClassError,
  InvalidEnrollmentIdError,
  InvalidEnrollmentStatusTransitionError,
  StudentAlreadyEnrolledInParishYearError,
} from '../errors/enrollment.errors';

export function rethrowEnrollmentServiceError(error: unknown): never {
  if (error instanceof InvalidEnrollmentIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidEnrollmentStatusTransitionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentNotActiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentImmutableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentTargetClassMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentTransferSameClassError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof StudentInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassNotAcceptingEnrollmentError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidClassIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StudentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ClassNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StudentAlreadyEnrolledInParishYearError) {
    throw new ConflictException(error.message);
  }

  if (
    error instanceof ParishScopeAccessDeniedError ||
    error instanceof ClassScopeAccessDeniedError ||
    error instanceof StudentAccessDeniedError ||
    error instanceof StudentManageAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
