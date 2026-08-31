import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  StorageObjectNotFoundError,
  StorageReadError,
  StorageWriteError,
} from '../providers/errors/storage-provider.errors';
import {
  InvalidMediaAssetInputError,
  MediaAssetAccessDeniedError,
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
  MediaStorageUnavailableError,
  MediaUploadCategoryNotAllowedError,
  MediaUploadFileMissingError,
  MediaUploadTooLargeError,
  UnsupportedMediaTypeError,
} from '../errors/media-asset.errors';

export function rethrowMediaServiceError(error: unknown): never {
  if (error instanceof MediaAssetNotFoundError || error instanceof StorageObjectNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof MediaAssetAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

  if (error instanceof MediaUploadTooLargeError) {
    throw new PayloadTooLargeException(error.message);
  }

  if (error instanceof UnsupportedMediaTypeError) {
    throw new UnsupportedMediaTypeException(error.message);
  }

  if (
    error instanceof MediaUploadCategoryNotAllowedError ||
    error instanceof InvalidMediaAssetInputError ||
    error instanceof MediaAssetCategoryMismatchError ||
    error instanceof MediaAssetNotReadyError ||
    error instanceof MediaUploadFileMissingError
  ) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof MediaStorageUnavailableError ||
    error instanceof StorageWriteError ||
    error instanceof StorageReadError
  ) {
    throw new ServiceUnavailableException(error.message);
  }

  if (error instanceof UnsupportedMediaTypeException) {
    throw error;
  }

  throw error;
}
