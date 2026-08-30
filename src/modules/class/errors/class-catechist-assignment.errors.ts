export class InvalidCatechistAssignmentIdError extends Error {
  constructor() {
    super('Catechist assignment id is invalid.');
    this.name = 'InvalidCatechistAssignmentIdError';
  }
}

export class CatechistAssignmentNotFoundError extends Error {
  constructor() {
    super('Catechist assignment was not found.');
    this.name = 'CatechistAssignmentNotFoundError';
  }
}

export class InvalidCatechistUserIdError extends Error {
  constructor() {
    super('Catechist user id is invalid.');
    this.name = 'InvalidCatechistUserIdError';
  }
}

export class CatechistUserNotFoundError extends Error {
  constructor() {
    super('Catechist user account was not found.');
    this.name = 'CatechistUserNotFoundError';
  }
}

export class CatechistUserInactiveError extends Error {
  constructor() {
    super('Catechist user account is not active.');
    this.name = 'CatechistUserInactiveError';
  }
}

export class CatechistAssignmentAlreadyActiveError extends Error {
  constructor() {
    super('An active catechist assignment already exists for this class and user.');
    this.name = 'CatechistAssignmentAlreadyActiveError';
  }
}

export class InvalidCatechistAssignmentRoleError extends Error {
  constructor() {
    super('Catechist assignment role is not supported.');
    this.name = 'InvalidCatechistAssignmentRoleError';
  }
}

export class InvalidCatechistAssignmentStatusTransitionError extends Error {
  constructor() {
    super('Catechist assignment status transition is not allowed.');
    this.name = 'InvalidCatechistAssignmentStatusTransitionError';
  }
}

export class CatechistNotAssignedToClassError extends Error {
  constructor() {
    super('Catechist is not actively assigned to this class.');
    this.name = 'CatechistNotAssignedToClassError';
  }
}
