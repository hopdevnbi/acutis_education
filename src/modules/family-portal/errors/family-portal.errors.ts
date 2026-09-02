export class ActorNotCatechistError extends Error {
  constructor() {
    super('Authenticated user is not a catechist actor.');
    this.name = 'ActorNotCatechistError';
  }
}

export class CatechistClassAccessDeniedError extends Error {
  constructor() {
    super('Catechist is not actively assigned to this class.');
    this.name = 'CatechistClassAccessDeniedError';
  }
}

export class ActorNotParentError extends Error {
  constructor() {
    super('Authenticated user is not a parent actor.');
    this.name = 'ActorNotParentError';
  }
}

export class ParentEnrollmentAccessDeniedError extends Error {
  constructor() {
    super('Parent is not linked to the enrollment student.');
    this.name = 'ParentEnrollmentAccessDeniedError';
  }
}
