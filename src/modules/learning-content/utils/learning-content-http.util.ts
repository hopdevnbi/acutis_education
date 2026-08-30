import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidLessonIdError,
  LessonNotFoundError,
} from '../../curriculum/errors/curriculum.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  ContentBlockLimitExceededError,
  ContentDocumentTooLargeError,
  ContentNotFoundForPublishError,
  InvalidContentAssetIdError,
  InvalidContentDocumentError,
  LessonContentDraftOnlyError,
  LessonContentNotFoundError,
} from '../errors/learning-content.errors';

export function rethrowLearningContentServiceError(error: unknown): never {
  if (error instanceof InvalidLessonIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof LessonNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof LessonContentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof InvalidContentDocumentError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof InvalidContentAssetIdError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ContentDocumentTooLargeError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof ContentBlockLimitExceededError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof LessonContentDraftOnlyError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ContentNotFoundForPublishError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ParishScopeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  throw error;
}
