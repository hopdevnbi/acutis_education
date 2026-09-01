import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
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
  PracticeAnswerIdempotencyConflictError,
  PracticeCanonicalLessonInvalidError,
  PracticeCurriculumMismatchError,
  PracticeCurriculumNotAssignedError,
  PracticeEnrollmentNotEligibleError,
  PracticeIdempotencyConflictError,
  PracticeInsufficientQuestionsError,
  PracticeInvalidAnswerError,
  PracticeInvalidGenerationInputError,
  PracticeMediaNotReferencedError,
  PracticeNoWrongQuestionsError,
  PracticeQuestionFinalizedError,
  PracticeReviewSourceInvalidError,
  PracticeReviewSourceNotCompletedError,
  PracticeSessionAbandonedError,
  PracticeSessionCompletedError,
  PracticeSessionNotFoundError,
  PracticeSessionQuestionContentUnavailableError,
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
    error instanceof QuestionVersionNotFoundError ||
    error instanceof PracticeSessionQuestionContentUnavailableError
  ) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof PracticeInvalidAnswerError) {
    throw new BadRequestException(error.message);
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
    error instanceof PracticeInvalidGenerationInputError ||
    error instanceof PracticeNoWrongQuestionsError ||
    error instanceof PracticeReviewSourceNotCompletedError ||
    error instanceof PracticeReviewSourceInvalidError
  ) {
    throw new UnprocessableEntityException(error.message);
  }

  if (
    error instanceof PracticeSessionCompletedError ||
    error instanceof PracticeSessionAbandonedError ||
    error instanceof PracticeIdempotencyConflictError ||
    error instanceof PracticeAnswerIdempotencyConflictError ||
    error instanceof PracticeQuestionFinalizedError ||
    error instanceof QuestionVersionNotDeliverableError
  ) {
    throw new ConflictException(error.message);
  }

  if (error instanceof MediaAssetNotFoundError || error instanceof MediaAssetNotReadyError) {
    rethrowMediaServiceError(error);
  }

  throw error;
}
