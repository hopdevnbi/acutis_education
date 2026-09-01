export class LearningProgressAccessDeniedError extends Error {
  constructor(message = 'Learning progress access denied.') {
    super(message);
    this.name = 'LearningProgressAccessDeniedError';
  }
}

export class LearningProgressEnrollmentNotWritableError extends Error {
  constructor(message = 'Enrollment is not eligible for lesson progress writes.') {
    super(message);
    this.name = 'LearningProgressEnrollmentNotWritableError';
  }
}

export class LearningProgressCanonicalLessonInvalidError extends Error {
  constructor(message = 'Canonical lesson key is not valid for the assigned curriculum.') {
    super(message);
    this.name = 'LearningProgressCanonicalLessonInvalidError';
  }
}

export class LessonProgressInvalidTransitionError extends Error {
  constructor(message = 'Lesson progress transition is not allowed.') {
    super(message);
    this.name = 'LessonProgressInvalidTransitionError';
  }
}

export class LessonProgressInvalidTargetStatusError extends Error {
  constructor(message = 'Lesson progress target status is invalid.') {
    super(message);
    this.name = 'LessonProgressInvalidTargetStatusError';
  }
}
