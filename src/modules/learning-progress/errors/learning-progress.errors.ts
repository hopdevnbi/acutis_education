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

export class LearningProgressCurriculumMismatchError extends Error {
  constructor(message = 'Curriculum filter does not match the assigned curriculum context.') {
    super(message);
    this.name = 'LearningProgressCurriculumMismatchError';
  }
}

export class LearningProgressClassProgressAccessDeniedError extends Error {
  constructor(message = 'Learning progress class access denied.') {
    super(message);
    this.name = 'LearningProgressClassProgressAccessDeniedError';
  }
}

export class LearningProgressCanonicalLessonRequiresCurriculumError extends Error {
  constructor(message = 'canonicalLessonKey filter requires curriculumId.') {
    super(message);
    this.name = 'LearningProgressCanonicalLessonRequiresCurriculumError';
  }
}
