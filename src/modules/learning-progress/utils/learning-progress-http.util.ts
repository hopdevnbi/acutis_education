import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EnrollmentNotFoundError } from '../../enrollment/errors/enrollment.errors';
import {
  LearningProgressAccessDeniedError,
  LearningProgressCanonicalLessonInvalidError,
  LearningProgressCanonicalLessonRequiresCurriculumError,
  LearningProgressClassProgressAccessDeniedError,
  LearningProgressCurriculumMismatchError,
  LearningProgressEnrollmentNotWritableError,
  LessonProgressInvalidTargetStatusError,
  LessonProgressInvalidTransitionError,
} from '../errors/learning-progress.errors';

export function rethrowLearningProgressServiceError(error: unknown): never {
  if (
    error instanceof LearningProgressAccessDeniedError ||
    error instanceof LearningProgressClassProgressAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof LessonProgressInvalidTargetStatusError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof LearningProgressCanonicalLessonRequiresCurriculumError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof EnrollmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof LearningProgressEnrollmentNotWritableError ||
    error instanceof LearningProgressCanonicalLessonInvalidError ||
    error instanceof LearningProgressCurriculumMismatchError
  ) {
    throw new UnprocessableEntityException(error.message);
  }

  if (error instanceof LessonProgressInvalidTransitionError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
