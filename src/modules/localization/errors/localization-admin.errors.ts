export class LocalizationAccessDeniedError extends Error {
  constructor() {
    super('Localization access denied.');
    this.name = 'LocalizationAccessDeniedError';
  }
}

export class LocalizationInvalidLocaleError extends Error {
  constructor() {
    super('Locale must be a valid BCP47 tag.');
    this.name = 'LocalizationInvalidLocaleError';
  }
}

export class LocalizationTargetMatchesSourceError extends Error {
  constructor() {
    super('Target locale must differ from the source locale.');
    this.name = 'LocalizationTargetMatchesSourceError';
  }
}

export class LocalizationInvalidPayloadError extends Error {
  constructor(message = 'Translation payload failed adapter validation.') {
    super(message);
    this.name = 'LocalizationInvalidPayloadError';
  }
}

export class LocalizationRevisionNotApprovableError extends Error {
  constructor() {
    super('Only machine-translated or reviewed revisions can be approved.');
    this.name = 'LocalizationRevisionNotApprovableError';
  }
}

export class LocalizationRevisionStaleError extends Error {
  constructor() {
    super('Translation revision source hash no longer matches current source content.');
    this.name = 'LocalizationRevisionStaleError';
  }
}

export class LocalizationJobNotRetryableError extends Error {
  constructor(message = 'Translation job cannot be retried in its current state.') {
    super(message);
    this.name = 'LocalizationJobNotRetryableError';
  }
}

export class LocalizationStatusFilterScanLimitExceededError extends Error {
  constructor() {
    super('Translation status filter scan exceeded the configured resource limit.');
    this.name = 'LocalizationStatusFilterScanLimitExceededError';
  }
}

export class LocalizationBulkLimitExceededError extends Error {
  constructor() {
    super('Bulk translation request exceeds the maximum resource count.');
    this.name = 'LocalizationBulkLimitExceededError';
  }
}

export class LocalizationSourceUnavailableError extends Error {
  constructor() {
    super('Translation source resource is unsupported or unavailable.');
    this.name = 'LocalizationSourceUnavailableError';
  }
}
