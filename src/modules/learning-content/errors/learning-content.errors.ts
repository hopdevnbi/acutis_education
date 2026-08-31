export class LessonContentNotFoundError extends Error {
  constructor() {
    super('Lesson content not found.');
    this.name = 'LessonContentNotFoundError';
  }
}

export class InvalidContentDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidContentDocumentError';
  }
}

export class ContentDocumentTooLargeError extends Error {
  constructor() {
    super('Content document exceeds the maximum allowed size.');
    this.name = 'ContentDocumentTooLargeError';
  }
}

export class ContentBlockLimitExceededError extends Error {
  constructor() {
    super('Content document exceeds the maximum block count.');
    this.name = 'ContentBlockLimitExceededError';
  }
}

export class LessonContentDraftOnlyError extends Error {
  constructor() {
    super('Lesson content can only be edited in a draft curriculum version.');
    this.name = 'LessonContentDraftOnlyError';
  }
}

export class InvalidContentAssetIdError extends Error {
  constructor() {
    super('Invalid content asset id.');
    this.name = 'InvalidContentAssetIdError';
  }
}

export class ContentNotFoundForPublishError extends Error {
  constructor(public readonly lessonId: string) {
    super(`Lesson content is missing or empty for publish (lessonId=${lessonId}).`);
    this.name = 'ContentNotFoundForPublishError';
  }
}

export class ContentAssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentAssetValidationError';
  }
}
