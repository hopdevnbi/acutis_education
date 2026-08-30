export class InvalidClassIdError extends Error {
  constructor() {
    super('Class id is invalid.');
    this.name = 'InvalidClassIdError';
  }
}

export class InvalidClassCodeError extends Error {
  constructor() {
    super('Class code is invalid.');
    this.name = 'InvalidClassCodeError';
  }
}

export class InvalidClassNameError extends Error {
  constructor() {
    super('Class name is invalid.');
    this.name = 'InvalidClassNameError';
  }
}

export class ClassNotFoundError extends Error {
  constructor() {
    super('Class was not found.');
    this.name = 'ClassNotFoundError';
  }
}

export class ClassCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Class code "${code}" already exists for this parish and academic year.`);
    this.name = 'ClassCodeAlreadyExistsError';
  }
}

export class InvalidClassStatusTransitionError extends Error {
  constructor() {
    super('Class status transition is not allowed.');
    this.name = 'InvalidClassStatusTransitionError';
  }
}

export class ClassImmutableError extends Error {
  constructor() {
    super('Completed or cancelled class records cannot be modified.');
    this.name = 'ClassImmutableError';
  }
}

export class ClassAcademicYearNotOperationalError extends Error {
  constructor() {
    super('Academic year is not operational for this class action.');
    this.name = 'ClassAcademicYearNotOperationalError';
  }
}

export class ClassCatechismLevelInactiveError extends Error {
  constructor() {
    super('Catechism level must be active for this class action.');
    this.name = 'ClassCatechismLevelInactiveError';
  }
}

export class ClassNotAcceptingEnrollmentError extends Error {
  constructor() {
    super('Class is not accepting enrollments.');
    this.name = 'ClassNotAcceptingEnrollmentError';
  }
}

export class ClassUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one class field must be provided for update.');
    this.name = 'ClassUpdateRequiresFieldsError';
  }
}
