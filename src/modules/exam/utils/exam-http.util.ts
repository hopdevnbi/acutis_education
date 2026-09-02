import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvalidParishIdError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../../parish/errors/parish.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import { ClassNotFoundError } from '../../class/errors/class.errors';
import {
  ExamAssignmentClassParishMismatchError,
  ExamAssignmentNotFoundError,
  ExamAssignmentNotOpenError,
  ExamAssignmentUpdateRequiresFieldsError,
  ExamAssignmentVersionNotPublishedError,
  ExamAccessDeniedError,
  ExamAttemptLimitReachedError,
  ExamAttemptNotFoundError,
  ExamAttemptQuestionsNotReadyError,
  ExamCodeAlreadyExistsError,
  ExamDraftAlreadyExistsError,
  ExamEnrollmentNotEligibleError,
  ExamIdempotencyConflictError,
  ExamInactiveError,
  ExamNotFoundError,
  ExamPublishValidationError,
  ExamQuestionParishMismatchError,
  ExamSourceLocaleImmutableError,
  ExamUpdateRequiresFieldsError,
  ExamVersionExamMismatchError,
  ExamVersionNotCloneableError,
  ExamVersionNotDraftError,
  ExamVersionNotFoundError,
  ExamVersionNotPublishedError,
  ExamVersionNumberConflictError,
  ExamVersionUpdateRequiresFieldsError,
  InvalidExamAssignmentIdError,
  InvalidExamAssignmentWindowError,
  InvalidExamAttemptIdError,
  InvalidExamCodeError,
  InvalidExamDescriptionError,
  InvalidExamDurationError,
  InvalidExamIdError,
  InvalidExamInstructionsError,
  InvalidExamMaxAttemptsError,
  InvalidExamPassingScoreError,
  InvalidExamReviewPolicyError,
  InvalidExamSourceLocaleError,
  InvalidExamTitleError,
  InvalidExamVersionIdError,
  InvalidExamVersionQuestionsError,
} from '../errors/exam.errors';

export function rethrowExamServiceError(error: unknown): never {
  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamVersionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamAssignmentIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamAttemptIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamTitleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamDescriptionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamInstructionsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamSourceLocaleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamDurationError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamMaxAttemptsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamPassingScoreError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamReviewPolicyError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamVersionQuestionsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidExamAssignmentWindowError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamVersionUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAssignmentUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamVersionExamMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamQuestionParishMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAssignmentClassParishMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAssignmentVersionNotPublishedError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAssignmentNotOpenError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamEnrollmentNotEligibleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAttemptQuestionsNotReadyError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ExamAttemptLimitReachedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamIdempotencyConflictError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamInactiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamVersionNotDraftError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamVersionNotPublishedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamVersionNotCloneableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamPublishValidationError) {
    throw new UnprocessableEntityException({
      message: error.message,
      issues: error.issues,
    });
  }

  if (error instanceof ExamNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ExamVersionNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ExamAssignmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ExamAttemptNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ClassNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ExamCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamDraftAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamVersionNumberConflictError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ExamSourceLocaleImmutableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ParishScopeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof ExamAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
