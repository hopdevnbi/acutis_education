import { ForbiddenException } from '@nestjs/common';
import { CatechistNotAssignedToClassError } from '../../class/errors/class-catechist-assignment.errors';
import { GuardianNotLinkedToStudentError } from '../../student/errors/student-guardian.errors';
import { rethrowLearningProgressServiceError } from '../../learning-progress/utils/learning-progress-http.util';
import {
  ActorNotCatechistError,
  ActorNotParentError,
  CatechistClassAccessDeniedError,
  ParentEnrollmentAccessDeniedError,
} from '../errors/family-portal.errors';

export function rethrowFamilyPortalServiceError(error: unknown): never {
  if (error instanceof ActorNotCatechistError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof ActorNotParentError) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof CatechistClassAccessDeniedError ||
    error instanceof CatechistNotAssignedToClassError
  ) {
    throw new ForbiddenException(
      error instanceof CatechistNotAssignedToClassError
        ? new CatechistClassAccessDeniedError().message
        : error.message,
    );
  }

  if (
    error instanceof ParentEnrollmentAccessDeniedError ||
    error instanceof GuardianNotLinkedToStudentError
  ) {
    throw new ForbiddenException(
      error instanceof GuardianNotLinkedToStudentError
        ? new ParentEnrollmentAccessDeniedError().message
        : error.message,
    );
  }

  rethrowLearningProgressServiceError(error);
}
