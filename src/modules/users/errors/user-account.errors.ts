export class UserEmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists.`);
    this.name = 'UserEmailAlreadyExistsError';
  }
}

export class InvalidEmailError extends Error {
  constructor() {
    super('Email address is invalid.');
    this.name = 'InvalidEmailError';
  }
}

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export class InvalidPreferredLocaleError extends Error {
  constructor() {
    super('Preferred locale is invalid.');
    this.name = 'InvalidPreferredLocaleError';
  }
}

export class UserAccountNotFoundError extends Error {
  constructor() {
    super('User account was not found.');
    this.name = 'UserAccountNotFoundError';
  }
}
