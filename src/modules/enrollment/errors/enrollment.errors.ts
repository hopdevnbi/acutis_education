export class InvalidEnrollmentIdError extends Error {
  constructor() {
    super('Enrollment id is invalid.');
    this.name = 'InvalidEnrollmentIdError';
  }
}

export class EnrollmentNotFoundError extends Error {
  constructor() {
    super('Enrollment was not found.');
    this.name = 'EnrollmentNotFoundError';
  }
}

export class EnrollmentNotActiveError extends Error {
  constructor() {
    super('Enrollment is not active.');
    this.name = 'EnrollmentNotActiveError';
  }
}

export class InvalidEnrollmentStatusTransitionError extends Error {
  constructor() {
    super('Enrollment status transition is not allowed.');
    this.name = 'InvalidEnrollmentStatusTransitionError';
  }
}

export class StudentAlreadyEnrolledInParishYearError extends Error {
  constructor() {
    super('Student already has an active enrollment for this parish and academic year.');
    this.name = 'StudentAlreadyEnrolledInParishYearError';
  }
}

export class EnrollmentTargetClassMismatchError extends Error {
  constructor() {
    super('Target class must belong to the same parish and academic year as the enrollment.');
    this.name = 'EnrollmentTargetClassMismatchError';
  }
}

export class EnrollmentTransferSameClassError extends Error {
  constructor() {
    super('Transfer target class must differ from the current class.');
    this.name = 'EnrollmentTransferSameClassError';
  }
}

export class EnrollmentImmutableError extends Error {
  constructor() {
    super('Terminal enrollment records cannot be modified.');
    this.name = 'EnrollmentImmutableError';
  }
}
