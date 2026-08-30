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
