export class InvalidParishCodeError extends Error {
  constructor() {
    super('Parish code is invalid.');
    this.name = 'InvalidParishCodeError';
  }
}

export class InvalidParishNameError extends Error {
  constructor() {
    super('Parish name is invalid.');
    this.name = 'InvalidParishNameError';
  }
}

export class InvalidParishIdError extends Error {
  constructor() {
    super('Parish id is invalid.');
    this.name = 'InvalidParishIdError';
  }
}

export class ParishCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Parish code "${code}" already exists.`);
    this.name = 'ParishCodeAlreadyExistsError';
  }
}

export class ParishNotFoundError extends Error {
  constructor() {
    super('Parish was not found.');
    this.name = 'ParishNotFoundError';
  }
}

export class ParishInactiveError extends Error {
  constructor() {
    super('Parish is inactive.');
    this.name = 'ParishInactiveError';
  }
}
