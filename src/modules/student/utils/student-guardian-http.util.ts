import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  GuardianLinkAlreadyActiveError,
  GuardianLinkNotFoundError,
  GuardianPrimaryAlreadyAssignedError,
  GuardianUserInactiveError,
  GuardianUserNotFoundError,
  InvalidGuardianLinkIdError,
  InvalidGuardianLinkStatusTransitionError,
  InvalidGuardianUserIdError,
} from '../errors/student-guardian.errors';
import { StudentNotFoundError } from '../errors/student.errors';

export function rethrowStudentGuardianServiceError(error: unknown): never {
  if (error instanceof InvalidGuardianLinkIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidGuardianUserIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidGuardianLinkStatusTransitionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof GuardianUserInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof GuardianLinkNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StudentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof GuardianUserNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof GuardianLinkAlreadyActiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof GuardianPrimaryAlreadyAssignedError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
