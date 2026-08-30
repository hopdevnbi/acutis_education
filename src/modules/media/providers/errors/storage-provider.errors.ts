export class StorageProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageProviderConfigurationError';
  }
}

export class StorageObjectNotFoundError extends Error {
  constructor() {
    super('Storage object not found.');
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageWriteError';
  }
}

export class StorageReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageReadError';
  }
}

export class StorageDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageDeleteError';
  }
}

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export class UnsafeStorageKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeStorageKeyError';
  }
}
