import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  CatholicGlossaryLocalePairError,
  CatholicGlossaryTermConflictError,
  CatholicGlossaryTermNotFoundError,
  CatholicGlossaryVersionImmutableError,
  CatholicGlossaryVersionNotFoundError,
  InvalidTranslationPayloadError,
  InvalidTranslationResourceTypeError,
  InvalidTranslationTargetLocaleError,
  TranslationJobNotFoundError,
  TranslationJobStateError,
  TranslationResourceNotFoundError,
  TranslationRevisionNotFoundError,
  UnsupportedTranslationResourceError,
} from '../errors/localization.errors';
import {
  LocalizationAccessDeniedError,
  LocalizationBulkLimitExceededError,
  LocalizationInvalidLocaleError,
  LocalizationInvalidPayloadError,
  LocalizationJobNotRetryableError,
  LocalizationRevisionNotApprovableError,
  LocalizationRevisionStaleError,
  LocalizationSourceUnavailableError,
  LocalizationStatusFilterScanLimitExceededError,
  LocalizationTargetMatchesSourceError,
} from '../errors/localization-admin.errors';

export function rethrowLocalizationServiceError(error: unknown): never {
  if (
    error instanceof InvalidTranslationResourceTypeError ||
    error instanceof InvalidTranslationTargetLocaleError ||
    error instanceof LocalizationInvalidLocaleError ||
    error instanceof LocalizationTargetMatchesSourceError
  ) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof InvalidTranslationPayloadError ||
    error instanceof LocalizationInvalidPayloadError
  ) {
    throw new UnprocessableEntityException(error.message);
  }

  if (
    error instanceof LocalizationRevisionStaleError ||
    error instanceof LocalizationJobNotRetryableError ||
    error instanceof CatholicGlossaryVersionImmutableError ||
    error instanceof CatholicGlossaryTermConflictError ||
    error instanceof CatholicGlossaryLocalePairError
  ) {
    throw new ConflictException(error.message);
  }

  if (
    error instanceof TranslationResourceNotFoundError ||
    error instanceof TranslationRevisionNotFoundError ||
    error instanceof TranslationJobNotFoundError ||
    error instanceof CatholicGlossaryVersionNotFoundError ||
    error instanceof CatholicGlossaryTermNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof LocalizationAccessDeniedError ||
    error instanceof ParishScopeAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof LocalizationBulkLimitExceededError ||
    error instanceof LocalizationStatusFilterScanLimitExceededError ||
    error instanceof LocalizationRevisionNotApprovableError ||
    error instanceof UnsupportedTranslationResourceError ||
    error instanceof LocalizationSourceUnavailableError ||
    error instanceof TranslationJobStateError
  ) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
