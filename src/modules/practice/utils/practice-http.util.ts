import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EnrollmentNotFoundError } from '../../enrollment/errors/enrollment.errors';
import {
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { rethrowMediaServiceError } from '../../media/utils/media-http.util';
import { StudentNotFoundError } from '../../student/errors/student.errors';
import {
  QuestionVersionNotDeliverableError,
  QuestionVersionNotFoundError,
} from '../../question-bank/errors/question-bank.errors';
import {
  PracticeAccessDeniedError,
  PracticeCanonicalLessonInvalidError,
  PracticeCurriculumMismatchError,
  PracticeCurriculumNotAssignedError,
  PracticeEnrollmentNotEligibleError,
  PracticeIdempotencyConflictError,
  PracticeInsufficientQuestionsError,
  PracticeInvalidGenerationInputError,
  PracticeMediaNotReferencedError,
  PracticeSessionAbandonedError,
  PracticeSessionCompletedError,
  PracticeSessionNotFoundError,
  PracticeSessionQuestionNotFoundError,
} from '../errors/practice.errors';

export function rethrowPracticeServiceError(error: unknown): never {
  if (error instanceof PracticeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof PracticeSessionNotFoundError ||
    error instanceof PracticeSessionQuestionNotFoundError ||
    error instanceof EnrollmentNotFoundError ||
    error instanceof StudentNotFoundError ||
    error instanceof QuestionVersionNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof PracticeMediaNotReferencedError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof PracticeInsufficientQuestionsError ||
    error instanceof PracticeEnrollmentNotEligibleError ||
    error instanceof PracticeCurriculumNotAssignedError ||
    error instanceof PracticeCurriculumMismatchError ||
    error instanceof PracticeCanonicalLessonInvalidError ||
    error instanceof PracticeInvalidGenerationInputError
  ) {
    throw new UnprocessableEntityException(error.message);
  }

  if (
    error instanceof PracticeSessionCompletedError ||
    error instanceof PracticeSessionAbandonedError ||
    error instanceof PracticeIdempotencyConflictError ||
    error instanceof QuestionVersionNotDeliverableError
  ) {
    throw new ConflictException(error.message);
  }

  if (error instanceof MediaAssetNotFoundError || error instanceof MediaAssetNotReadyError) {
    rethrowMediaServiceError(error);
  }

  throw error;
}
