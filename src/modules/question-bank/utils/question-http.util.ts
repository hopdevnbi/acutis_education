import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CanonicalLessonKeyNotInCurriculumError,
  CurriculumInactiveError,
  CurriculumNotFoundError,
  CurriculumVersionCurriculumMismatchError,
  InvalidCurriculumIdError,
  InvalidCurriculumSourceLocaleError,
  InvalidCurriculumVersionIdError,
} from '../../curriculum/errors/curriculum.errors';
import {
  InvalidParishIdError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../../parish/errors/parish.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import {
  InvalidQuestionCodeError,
  InvalidQuestionCurriculumLinkIdError,
  InvalidQuestionCurriculumLinkInputError,
  InvalidQuestionDifficultyError,
  InvalidQuestionExplanationError,
  InvalidQuestionIdError,
  InvalidQuestionInstructionError,
  InvalidQuestionMediaJsonError,
  InvalidQuestionOptionCodeError,
  InvalidQuestionOptionCountError,
  InvalidQuestionOptionIdError,
  InvalidQuestionOptionRepresentationError,
  InvalidQuestionOptionSortOrderError,
  InvalidQuestionOptionTextError,
  InvalidCorrectOptionIdsError,
  DuplicateQuestionOptionCodeError,
  InvalidGradeAnswerInputError,
  InvalidQuestionPromptError,
  InvalidQuestionSourceLocaleError,
  InvalidQuestionTagCodeError,
  InvalidQuestionTagIdError,
  InvalidQuestionTagNameError,
  InvalidQuestionTypeError,
  InvalidQuestionVersionIdError,
  QuestionBlankDraftNotAllowedError,
  QuestionCloneSourceInvalidError,
  QuestionCodeAlreadyExistsError,
  QuestionCurriculumLinkAlreadyExistsError,
  QuestionCurriculumLinkNotFoundError,
  QuestionCurriculumParishMismatchError,
  QuestionDraftAlreadyExistsError,
  QuestionInactiveError,
  QuestionNotFoundError,
  QuestionParishImmutableError,
  QuestionPublishValidationError,
  QuestionSourceLocaleImmutableError,
  QuestionTypeChangeNotAllowedError,
  QuestionTagCodeAlreadyExistsError,
  QuestionTagInactiveError,
  QuestionTagLinkAlreadyExistsError,
  QuestionTagLinkNotFoundError,
  QuestionTagNotFoundError,
  QuestionTagParishMismatchError,
  QuestionUpdateRequiresFieldsError,
  QuestionVersionNotCloneableError,
  QuestionVersionNotDraftError,
  QuestionVersionNotFoundError,
  QuestionVersionNotGradableError,
  QuestionVersionNotPublishedError,
  QuestionVersionNumberConflictError,
  QuestionOptionNotFoundError,
} from '../errors/question-bank.errors';

export function rethrowQuestionBankServiceError(error: unknown): never {
  if (error instanceof InvalidParishIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ParishNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ParishInactiveError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionVersionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionTagIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionCurriculumLinkIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionSourceLocaleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumSourceLocaleError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionPromptError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionInstructionError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionExplanationError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionTypeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionDifficultyError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionMediaJsonError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionTextError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionRepresentationError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionCountError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionSortOrderError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionOptionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCorrectOptionIdsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof DuplicateQuestionOptionCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidGradeAnswerInputError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionCloneSourceInvalidError) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof MediaAssetNotFoundError ||
    error instanceof MediaAssetNotReadyError ||
    error instanceof MediaAssetCategoryMismatchError
  ) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionTagCodeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionTagNameError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidQuestionCurriculumLinkInputError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidCurriculumVersionIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionParishImmutableError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionUpdateRequiresFieldsError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionTagParishMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionCurriculumParishMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CurriculumVersionCurriculumMismatchError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof CanonicalLessonKeyNotInCurriculumError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof QuestionInactiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionTagInactiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof CurriculumInactiveError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionVersionNotDraftError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionVersionNotPublishedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionVersionNotCloneableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionTypeChangeNotAllowedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionVersionNotGradableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionPublishValidationError) {
    throw new UnprocessableEntityException({
      message: error.message,
      issues: error.issues,
    });
  }

  if (error instanceof QuestionNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionVersionNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionOptionNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionTagNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionCurriculumLinkNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionTagLinkNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CurriculumNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof QuestionCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionTagCodeAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionDraftAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionVersionNumberConflictError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionSourceLocaleImmutableError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionBlankDraftNotAllowedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionTagLinkAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof QuestionCurriculumLinkAlreadyExistsError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ParishScopeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
