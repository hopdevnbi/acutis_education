import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  InvalidParishIdError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../../parish/errors/parish.errors';
import {
  AcademicYearAlreadyExistsError,
  AcademicYearClosedImmutableError,
  AcademicYearNotFoundError,
  ActiveAcademicYearAlreadyExistsError,
  InvalidAcademicYearDateRangeError,
  InvalidAcademicYearIdError,
  InvalidAcademicYearNameError,
  InvalidAcademicYearStatusTransitionError,
} from '../errors/academic-year.errors';
import {
  CatechismLevelCodeAlreadyExistsError,
  CatechismLevelNotFoundError,
  InvalidCatechismLevelCodeError,
  InvalidCatechismLevelIdError,
  InvalidCatechismLevelNameError,
  InvalidCatechismLevelSortOrderError,
} from '../errors/catechism-level.errors';

export function rethrowAcademicStructureServiceError(error: unknown): never {
  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidAcademicYearIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidAcademicYearNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidAcademicYearDateRangeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidAcademicYearStatusTransitionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof AcademicYearNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof AcademicYearAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ActiveAcademicYearAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof AcademicYearClosedImmutableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechismLevelIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechismLevelCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechismLevelNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCatechismLevelSortOrderError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CatechismLevelNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechismLevelCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
