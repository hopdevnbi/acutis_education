import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  ClassNotAcceptingEnrollmentError,
  ClassNotFoundError,
  InvalidClassIdError,
} from '../errors/class.errors';
import {
  CatechistAssignmentAlreadyActiveError,
  CatechistAssignmentNotFoundError,
  CatechistUserInactiveError,
  CatechistUserNotFoundError,
  InvalidCatechistAssignmentIdError,
  InvalidCatechistAssignmentRoleError,
  InvalidCatechistAssignmentStatusTransitionError,
  InvalidCatechistUserIdError,
} from '../errors/class-catechist-assignment.errors';

export function rethrowClassCatechistAssignmentServiceError(error: unknown): never {
  if (error instanceof InvalidClassIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechistAssignmentIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechistUserIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechistAssignmentRoleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechistAssignmentStatusTransitionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CatechistUserInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechistAssignmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechistUserNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechistAssignmentAlreadyActiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ClassNotAcceptingEnrollmentError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
