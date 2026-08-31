export class MediaAssetNotFoundError extends Error {
  constructor() {
    super('Media asset not found.');
    this.name = 'MediaAssetNotFoundError';
  }
}

export class MediaAssetNotReadyError extends Error {
  constructor() {
    super('Media asset is not ready for use.');
    this.name = 'MediaAssetNotReadyError';
  }
}

export class MediaAssetCategoryMismatchError extends Error {
  constructor(expectedCategory: string, actualCategory: string) {
    super(`Media asset category mismatch. Expected ${expectedCategory}, got ${actualCategory}.`);
    this.name = 'MediaAssetCategoryMismatchError';
  }
}

export class InvalidMediaAssetInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMediaAssetInputError';
  }
}

export class MediaAssetAccessDeniedError extends Error {
  constructor() {
    super('Media asset access denied.');
    this.name = 'MediaAssetAccessDeniedError';
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMediaTypeError';
  }
}

export class MediaUploadTooLargeError extends Error {
  constructor() {
    super('Uploaded media exceeds the allowed size limit.');
    this.name = 'MediaUploadTooLargeError';
  }
}

export class MediaUploadCategoryNotAllowedError extends Error {
  constructor() {
    super('Media upload category is not enabled.');
    this.name = 'MediaUploadCategoryNotAllowedError';
  }
}

export class MediaStorageUnavailableError extends Error {
  constructor() {
    super('Media storage is temporarily unavailable.');
    this.name = 'MediaStorageUnavailableError';
  }
}

export class MediaUploadFileMissingError extends Error {
  constructor() {
    super('Upload file is required.');
    this.name = 'MediaUploadFileMissingError';
  }
}
