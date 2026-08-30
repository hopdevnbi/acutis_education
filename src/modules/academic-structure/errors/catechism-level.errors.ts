export class InvalidCatechismLevelIdError extends Error {
  constructor() {
    super('Catechism level id is invalid.');
    this.name = 'InvalidCatechismLevelIdError';
  }
}

export class InvalidCatechismLevelCodeError extends Error {
  constructor() {
    super('Catechism level code is invalid.');
    this.name = 'InvalidCatechismLevelCodeError';
  }
}

export class InvalidCatechismLevelNameError extends Error {
  constructor() {
    super('Catechism level name is invalid.');
    this.name = 'InvalidCatechismLevelNameError';
  }
}

export class InvalidCatechismLevelSortOrderError extends Error {
  constructor() {
    super('Catechism level sort order is invalid.');
    this.name = 'InvalidCatechismLevelSortOrderError';
  }
}

export class CatechismLevelNotFoundError extends Error {
  constructor() {
    super('Catechism level was not found.');
    this.name = 'CatechismLevelNotFoundError';
  }
}

export class CatechismLevelCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Catechism level code "${code}" already exists for this parish.`);
    this.name = 'CatechismLevelCodeAlreadyExistsError';
  }
}

export class CatechismLevelDoesNotBelongToParishError extends Error {
  constructor() {
    super('Catechism level does not belong to this parish.');
    this.name = 'CatechismLevelDoesNotBelongToParishError';
  }
}
