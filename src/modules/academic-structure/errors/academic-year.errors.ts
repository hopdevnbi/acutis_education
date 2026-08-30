export class InvalidAcademicYearIdError extends Error {
  constructor() {
    super('Academic year id is invalid.');
    this.name = 'InvalidAcademicYearIdError';
  }
}

export class InvalidAcademicYearNameError extends Error {
  constructor() {
    super('Academic year name is invalid.');
    this.name = 'InvalidAcademicYearNameError';
  }
}

export class InvalidAcademicYearDateRangeError extends Error {
  constructor() {
    super('Academic year start date must be before end date.');
    this.name = 'InvalidAcademicYearDateRangeError';
  }
}

export class AcademicYearNotFoundError extends Error {
  constructor() {
    super('Academic year was not found.');
    this.name = 'AcademicYearNotFoundError';
  }
}

export class AcademicYearAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Academic year "${name}" already exists for this parish.`);
    this.name = 'AcademicYearAlreadyExistsError';
  }
}

export class InvalidAcademicYearStatusTransitionError extends Error {
  constructor() {
    super('Academic year status transition is not allowed.');
    this.name = 'InvalidAcademicYearStatusTransitionError';
  }
}

export class ActiveAcademicYearAlreadyExistsError extends Error {
  constructor() {
    super('An active academic year already exists for this parish.');
    this.name = 'ActiveAcademicYearAlreadyExistsError';
  }
}

export class AcademicYearClosedImmutableError extends Error {
  constructor() {
    super('Closed academic year records cannot be modified.');
    this.name = 'AcademicYearClosedImmutableError';
  }
}
