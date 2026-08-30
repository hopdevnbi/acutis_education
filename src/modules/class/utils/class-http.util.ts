import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  AcademicYearDoesNotBelongToParishError,
  AcademicYearNotFoundError,
} from '../../academic-structure/errors/academic-year.errors';
import {
  CatechismLevelDoesNotBelongToParishError,
  CatechismLevelNotFoundError,
} from '../../academic-structure/errors/catechism-level.errors';
import {
  InvalidParishIdError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../../parish/errors/parish.errors';
import {
  ClassAcademicYearNotOperationalError,
  ClassCatechismLevelInactiveError,
  ClassCodeAlreadyExistsError,
  ClassImmutableError,
  ClassNotFoundError,
  InvalidClassCodeError,
  InvalidClassIdError,
  InvalidClassNameError,
  InvalidClassStatusTransitionError,
  ClassUpdateRequiresFieldsError,
} from '../errors/class.errors';

export function rethrowClassServiceError(error: unknown): never {
  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidClassIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidClassCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidClassNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidClassStatusTransitionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassImmutableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassAcademicYearNotOperationalError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassCatechismLevelInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ClassNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ClassCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof AcademicYearNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof AcademicYearDoesNotBelongToParishError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CatechismLevelNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechismLevelDoesNotBelongToParishError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
