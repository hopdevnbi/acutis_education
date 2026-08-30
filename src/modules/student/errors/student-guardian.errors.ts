export class InvalidGuardianLinkIdError extends Error {
  constructor() {
    super('Guardian link id is invalid.');
    this.name = 'InvalidGuardianLinkIdError';
  }
}

export class InvalidGuardianUserIdError extends Error {
  constructor() {
    super('Guardian user id is invalid.');
    this.name = 'InvalidGuardianUserIdError';
  }
}

export class GuardianLinkNotFoundError extends Error {
  constructor() {
    super('Guardian link was not found.');
    this.name = 'GuardianLinkNotFoundError';
  }
}

export class GuardianUserNotFoundError extends Error {
  constructor() {
    super('Guardian user account was not found.');
    this.name = 'GuardianUserNotFoundError';
  }
}

export class GuardianUserInactiveError extends Error {
  constructor() {
    super('Guardian user account is not active.');
    this.name = 'GuardianUserInactiveError';
  }
}

export class GuardianLinkAlreadyActiveError extends Error {
  constructor() {
    super('An active guardian link already exists for this student and user.');
    this.name = 'GuardianLinkAlreadyActiveError';
  }
}

export class GuardianPrimaryAlreadyAssignedError extends Error {
  constructor() {
    super('This student already has an active primary guardian.');
    this.name = 'GuardianPrimaryAlreadyAssignedError';
  }
}

export class InvalidGuardianLinkStatusTransitionError extends Error {
  constructor() {
    super('Guardian link status transition is not allowed.');
    this.name = 'InvalidGuardianLinkStatusTransitionError';
  }
}

export class GuardianNotLinkedToStudentError extends Error {
  constructor() {
    super('Guardian is not actively linked to this student.');
    this.name = 'GuardianNotLinkedToStudentError';
  }
}
