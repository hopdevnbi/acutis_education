import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClassNotFoundError } from '../../class/errors/class.errors';
import {
  AttendanceAlreadyFinalizedError,
  AttendanceEnrollmentNotInSessionRosterError,
  ClassOperationsAccessDeniedError,
  ClassSessionNotEditableError,
  ClassSessionNotFoundError,
  DuplicateAttendanceEnrollmentInputError,
  InvalidClassSessionTimeRangeError,
} from '../errors/class-operations.errors';
import { rethrowClassOperationsServiceError } from './class-operations-http.util';

describe('rethrowClassOperationsServiceError', () => {
  it('maps access denied to 403', () => {
    expect(() =>
      rethrowClassOperationsServiceError(new ClassOperationsAccessDeniedError()),
    ).toThrow(ForbiddenException);
  });

  it('maps not found to 404', () => {
    expect(() => rethrowClassOperationsServiceError(new ClassSessionNotFoundError())).toThrow(
      NotFoundException,
    );
    expect(() => rethrowClassOperationsServiceError(new ClassNotFoundError())).toThrow(
      NotFoundException,
    );
  });

  it('maps lifecycle and finalize conflicts to 409', () => {
    expect(() => rethrowClassOperationsServiceError(new ClassSessionNotEditableError())).toThrow(
      ConflictException,
    );
    expect(() => rethrowClassOperationsServiceError(new AttendanceAlreadyFinalizedError())).toThrow(
      ConflictException,
    );
  });

  it('maps roster membership to 422 and duplicates/time to 400', () => {
    expect(() =>
      rethrowClassOperationsServiceError(new AttendanceEnrollmentNotInSessionRosterError()),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      rethrowClassOperationsServiceError(new DuplicateAttendanceEnrollmentInputError()),
    ).toThrow(BadRequestException);
    expect(() =>
      rethrowClassOperationsServiceError(new InvalidClassSessionTimeRangeError()),
    ).toThrow(BadRequestException);
  });
});
