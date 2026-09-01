export class InvalidTranslationResourceTypeError extends Error {
  constructor() {
    super('Translation resource type is invalid.');
    this.name = 'InvalidTranslationResourceTypeError';
  }
}

export class InvalidTranslationResourceIdError extends Error {
  constructor() {
    super('Translation resource id must be a UUID v4.');
    this.name = 'InvalidTranslationResourceIdError';
  }
}

export class TranslationResourceBindingConflictError extends Error {
  constructor() {
    super('Translation resource binding conflicts with an existing parish or source locale.');
    this.name = 'TranslationResourceBindingConflictError';
  }
}

export class TranslationResourceNotFoundError extends Error {
  constructor() {
    super('Translation resource was not found.');
    this.name = 'TranslationResourceNotFoundError';
  }
}

export class InvalidTranslationTargetLocaleError extends Error {
  constructor() {
    super('Target locale must be valid and differ from the source locale.');
    this.name = 'InvalidTranslationTargetLocaleError';
  }
}

export class InvalidTranslationSourceContentHashError extends Error {
  constructor() {
    super('Source content hash must be a 64-character lowercase SHA-256 hex value.');
    this.name = 'InvalidTranslationSourceContentHashError';
  }
}

export class InvalidTranslationPayloadError extends Error {
  constructor(message = 'Translation payload must be a bounded JSON object.') {
    super(message);
    this.name = 'InvalidTranslationPayloadError';
  }
}

export class InvalidTranslationRevisionStatusError extends Error {
  constructor() {
    super('Translation revision status is invalid.');
    this.name = 'InvalidTranslationRevisionStatusError';
  }
}

export class TranslationRevisionApprovalIntegrityError extends Error {
  constructor() {
    super('Approved translation revisions require approval metadata.');
    this.name = 'TranslationRevisionApprovalIntegrityError';
  }
}

export class TranslationRevisionNotFoundError extends Error {
  constructor() {
    super('Translation revision was not found.');
    this.name = 'TranslationRevisionNotFoundError';
  }
}
