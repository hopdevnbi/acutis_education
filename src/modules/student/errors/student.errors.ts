export class InvalidStudentIdError extends Error {
  constructor() {
    super('Student id is invalid.');
    this.name = 'InvalidStudentIdError';
  }
}

export class InvalidStudentFullNameError extends Error {
  constructor() {
    super('Student full name is invalid.');
    this.name = 'InvalidStudentFullNameError';
  }
}

export class InvalidStudentUserIdError extends Error {
  constructor() {
    super('Student user id is invalid.');
    this.name = 'InvalidStudentUserIdError';
  }
}

export class StudentNotFoundError extends Error {
  constructor() {
    super('Student was not found.');
    this.name = 'StudentNotFoundError';
  }
}

export class StudentInactiveError extends Error {
  constructor() {
    super('Student profile is inactive.');
    this.name = 'StudentInactiveError';
  }
}

export class StudentUserAlreadyLinkedError extends Error {
  constructor() {
    super('This user account is already linked to another student profile.');
    this.name = 'StudentUserAlreadyLinkedError';
  }
}

export class StudentLinkedUserNotFoundError extends Error {
  constructor() {
    super('Linked user account was not found.');
    this.name = 'StudentLinkedUserNotFoundError';
  }
}

export class StudentUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one student field must be provided for update.');
    this.name = 'StudentUpdateRequiresFieldsError';
  }
}
