export class PracticeSessionNotFoundError extends Error {
  readonly code = 'PRACTICE_SESSION_NOT_FOUND' as const;

  constructor() {
    super('Practice session was not found.');
    this.name = 'PracticeSessionNotFoundError';
  }
}

export class PracticeSessionQuestionNotFoundError extends Error {
  readonly code = 'PRACTICE_QUESTION_NOT_FOUND' as const;

  constructor() {
    super('Practice session question was not found.');
    this.name = 'PracticeSessionQuestionNotFoundError';
  }
}

export class PracticeAccessDeniedError extends Error {
  readonly code = 'PRACTICE_ACCESS_DENIED' as const;

  constructor() {
    super('Practice access was denied.');
    this.name = 'PracticeAccessDeniedError';
  }
}

export class PracticeEnrollmentNotEligibleError extends Error {
  readonly code = 'PRACTICE_ENROLLMENT_NOT_ELIGIBLE' as const;

  constructor() {
    super('Enrollment is not eligible for practice.');
    this.name = 'PracticeEnrollmentNotEligibleError';
  }
}

export class PracticeInsufficientQuestionsError extends Error {
  readonly code = 'PRACTICE_INSUFFICIENT_QUESTIONS' as const;

  constructor(
    readonly requestedCount: number,
    readonly availableCount: number,
  ) {
    super('Not enough published questions match the practice generation filters.');
    this.name = 'PracticeInsufficientQuestionsError';
  }
}

export class PracticeCurriculumMismatchError extends Error {
  readonly code = 'PRACTICE_CURRICULUM_MISMATCH' as const;

  constructor() {
    super('Requested curriculum does not match the learner assignment.');
    this.name = 'PracticeCurriculumMismatchError';
  }
}

export class PracticeCurriculumNotAssignedError extends Error {
  readonly code = 'PRACTICE_CURRICULUM_NOT_ASSIGNED' as const;

  constructor() {
    super('No published curriculum is assigned for this learner context.');
    this.name = 'PracticeCurriculumNotAssignedError';
  }
}

export class PracticeCanonicalLessonInvalidError extends Error {
  readonly code = 'PRACTICE_CANONICAL_LESSON_INVALID' as const;

  constructor() {
    super('Canonical lesson key does not belong to the assigned curriculum.');
    this.name = 'PracticeCanonicalLessonInvalidError';
  }
}

export class PracticeSessionCompletedError extends Error {
  readonly code = 'PRACTICE_SESSION_COMPLETED' as const;

  constructor() {
    super('Practice session is already completed.');
    this.name = 'PracticeSessionCompletedError';
  }
}

export class PracticeSessionAbandonedError extends Error {
  readonly code = 'PRACTICE_SESSION_ABANDONED' as const;

  constructor() {
    super('Practice session has been abandoned.');
    this.name = 'PracticeSessionAbandonedError';
  }
}

export class PracticeMediaNotReferencedError extends Error {
  readonly code = 'PRACTICE_MEDIA_NOT_REFERENCED' as const;

  constructor() {
    super('Media asset is not referenced by the practice session question.');
    this.name = 'PracticeMediaNotReferencedError';
  }
}

export class PracticeIdempotencyConflictError extends Error {
  readonly code = 'PRACTICE_IDEMPOTENCY_CONFLICT' as const;

  constructor() {
    super('Client request id was reused with a different generation payload.');
    this.name = 'PracticeIdempotencyConflictError';
  }
}

export class PracticeInvalidGenerationInputError extends Error {
  readonly code = 'PRACTICE_INVALID_GENERATION_INPUT' as const;

  constructor(message: string) {
    super(message);
    this.name = 'PracticeInvalidGenerationInputError';
  }
}
