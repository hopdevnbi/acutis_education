import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvalidParishIdError, ParishNotFoundError } from '../../parish/errors/parish.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import {
  InvalidStudentFullNameError,
  InvalidStudentIdError,
  InvalidStudentUserIdError,
  StudentInactiveError,
  StudentLinkedUserNotFoundError,
  StudentNotFoundError,
  StudentUpdateRequiresFieldsError,
  StudentUserAlreadyLinkedError,
} from '../errors/student.errors';
import {
  StudentAccessDeniedError,
  StudentManageAccessDeniedError,
} from '../errors/student-access.errors';

export function rethrowStudentServiceError(error: unknown): never {
  if (error instanceof InvalidStudentIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidStudentFullNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidStudentUserIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof StudentUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof StudentInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof StudentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StudentLinkedUserNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StudentUserAlreadyLinkedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof StudentAccessDeniedError ||
    error instanceof StudentManageAccessDeniedError ||
    error instanceof ParishScopeAccessDeniedError ||
    error instanceof ClassScopeAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
