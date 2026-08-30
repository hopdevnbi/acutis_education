import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  CurriculumAssignmentAcademicYearNotDeliverableError,
  CurriculumAssignmentNotFoundError,
  CurriculumAssignmentVersionMismatchError,
  CurriculumCatechismLevelInactiveError,
  CurriculumCodeAlreadyExistsError,
  CurriculumDraftAlreadyExistsError,
  CurriculumInactiveError,
  CurriculumNotFoundError,
  CurriculumPublishValidationError,
  CurriculumSourceLocaleImmutableError,
  CurriculumStructuralFieldImmutableError,
  CurriculumUpdateRequiresFieldsError,
  CurriculumVersionNotCloneableError,
  CurriculumVersionNotDraftError,
  CurriculumVersionNotFoundError,
  CurriculumVersionNotPublishedError,
  CurriculumVersionNumberConflictError,
  InvalidCurriculumAssignmentInputError,
  InvalidCurriculumCodeError,
  InvalidCurriculumDescriptionError,
  InvalidCurriculumIdError,
  InvalidCurriculumNameError,
  InvalidCurriculumSourceLocaleError,
  InvalidCurriculumVersionIdError,
} from '../errors/curriculum.errors';
import {
  InvalidCanonicalLessonKeyMutationError,
  InvalidLessonCodeError,
  InvalidLessonDurationError,
  InvalidLessonIdError,
  InvalidLessonReorderError,
  InvalidLessonSummaryError,
  InvalidLessonTitleError,
  LessonCodeAlreadyExistsError,
  LessonNotFoundError,
  LessonVersionMismatchError,
} from '../errors/lesson.errors';
import {
  InvalidTopicCodeError,
  InvalidTopicDescriptionError,
  InvalidTopicIdError,
  InvalidTopicReorderError,
  InvalidTopicTitleError,
  TopicCodeAlreadyExistsError,
  TopicNotEmptyError,
  TopicNotFoundError,
} from '../errors/topic.errors';

export function rethrowCurriculumServiceError(error: unknown): never {
  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumAssignmentInputError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumVersionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidTopicIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumSourceLocaleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumDescriptionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidTopicCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidTopicTitleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonTitleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidTopicDescriptionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonSummaryError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonDurationError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidTopicReorderError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidLessonReorderError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCanonicalLessonKeyMutationError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof LessonVersionMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumStructuralFieldImmutableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumInactiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumCatechismLevelInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumVersionNotDraftError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumVersionNotPublishedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumPublishValidationError) {
    throw new UnprocessableEntityException({
      message: error.message,
      issues: error.issues,
    });
  }

  if (error instanceof CurriculumVersionNotCloneableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumAssignmentAcademicYearNotDeliverableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumAssignmentVersionMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CurriculumVersionNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof TopicNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof LessonNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CurriculumAssignmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CurriculumCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof TopicCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof LessonCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumDraftAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumVersionNumberConflictError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumSourceLocaleImmutableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof TopicNotEmptyError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CatechismLevelNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CatechismLevelDoesNotBelongToParishError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof AcademicYearNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof AcademicYearDoesNotBelongToParishError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishScopeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
