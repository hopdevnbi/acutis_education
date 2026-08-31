import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import {
  CurriculumAssignmentNotFoundError,
  CurriculumVersionNotPublishedError,
} from '../../curriculum/errors/curriculum.errors';
import {
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { rethrowMediaServiceError } from '../../media/utils/media-http.util';
import { StudentAccessDeniedError } from '../../student/errors/student-access.errors';
import { LessonContentNotFoundError } from '../../learning-content/errors/learning-content.errors';
import {
  ContextualMediaAssetNotReferencedError,
  DraftCurriculumDeliveryDeniedError,
  LessonNotInAssignedCurriculumError,
  PublishedLessonContentNotFoundError,
} from '../errors/curriculum-delivery.errors';

export function rethrowCurriculumDeliveryServiceError(error: unknown): never {
  if (error instanceof ClassScopeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof StudentAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof CurriculumAssignmentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof CurriculumVersionNotPublishedError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof DraftCurriculumDeliveryDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof LessonNotInAssignedCurriculumError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof ContextualMediaAssetNotReferencedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof LessonContentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof PublishedLessonContentNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof MediaAssetNotFoundError || error instanceof MediaAssetNotReadyError) {
    rethrowMediaServiceError(error);
  }

  throw error;
}
