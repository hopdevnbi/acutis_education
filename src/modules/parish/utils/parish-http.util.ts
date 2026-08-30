import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  InvalidParishCodeError,
  InvalidParishIdError,
  InvalidParishNameError,
  ParishCodeAlreadyExistsError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../errors/parish.errors';

export function rethrowParishServiceError(error: unknown): never {
  if (error instanceof InvalidParishCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidParishNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
