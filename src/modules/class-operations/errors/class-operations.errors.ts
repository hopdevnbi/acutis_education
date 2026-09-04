export class ClassSessionNotFoundError extends Error {
  constructor() {
    super('Class session not found.');
    this.name = 'ClassSessionNotFoundError';
  }
}

export class ClassSessionNotEditableError extends Error {
  constructor() {
    super('Class session is not editable.');
    this.name = 'ClassSessionNotEditableError';
  }
}

export class InvalidClassSessionTransitionError extends Error {
  constructor() {
    super('Invalid class session status transition.');
    this.name = 'InvalidClassSessionTransitionError';
  }
}

export class AttendanceEnrollmentNotInSessionRosterError extends Error {
  constructor() {
    super('Enrollment is not on the session roster.');
    this.name = 'AttendanceEnrollmentNotInSessionRosterError';
  }
}

export class AttendanceAlreadyFinalizedError extends Error {
  constructor() {
    super('Attendance is locked because the session is finalized.');
    this.name = 'AttendanceAlreadyFinalizedError';
  }
}

export class DuplicateAttendanceEnrollmentInputError extends Error {
  constructor() {
    super('Duplicate enrollmentId in attendance payload.');
    this.name = 'DuplicateAttendanceEnrollmentInputError';
  }
}

export class InvalidClassSessionIdError extends Error {
  constructor() {
    super('Invalid class session id.');
    this.name = 'InvalidClassSessionIdError';
  }
}

export class InvalidClassSessionTimeRangeError extends Error {
  constructor() {
    super('Class session endsAt must be after startsAt.');
    this.name = 'InvalidClassSessionTimeRangeError';
  }
}

export class ClassSessionRosterImmutableError extends Error {
  constructor() {
    super('Session roster is immutable.');
    this.name = 'ClassSessionRosterImmutableError';
  }
}

export class InvalidAttendanceStatusError extends Error {
  constructor() {
    super('Invalid attendance status.');
    this.name = 'InvalidAttendanceStatusError';
  }
}

export class InvalidAttendanceNoteError extends Error {
  constructor() {
    super('Invalid attendance note.');
    this.name = 'InvalidAttendanceNoteError';
  }
}
