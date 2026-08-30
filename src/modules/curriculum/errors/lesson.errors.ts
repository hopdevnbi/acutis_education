export class InvalidLessonIdError extends Error {
  constructor() {
    super('Invalid lesson id.');
    this.name = 'InvalidLessonIdError';
  }
}

export class LessonNotFoundError extends Error {
  constructor() {
    super('Lesson not found.');
    this.name = 'LessonNotFoundError';
  }
}

export class InvalidLessonCodeError extends Error {
  constructor() {
    super('Invalid lesson code.');
    this.name = 'InvalidLessonCodeError';
  }
}

export class InvalidLessonTitleError extends Error {
  constructor() {
    super('Invalid lesson title.');
    this.name = 'InvalidLessonTitleError';
  }
}

export class InvalidLessonSummaryError extends Error {
  constructor() {
    super('Invalid lesson summary.');
    this.name = 'InvalidLessonSummaryError';
  }
}

export class InvalidLessonDurationError extends Error {
  constructor() {
    super('Invalid lesson estimated duration.');
    this.name = 'InvalidLessonDurationError';
  }
}

export class LessonCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Lesson code "${code}" already exists in this topic.`);
    this.name = 'LessonCodeAlreadyExistsError';
  }
}

export class InvalidLessonReorderError extends Error {
  constructor() {
    super('Invalid lesson reorder request.');
    this.name = 'InvalidLessonReorderError';
  }
}

export class LessonVersionMismatchError extends Error {
  constructor() {
    super('Lesson curriculum version does not match topic curriculum version.');
    this.name = 'LessonVersionMismatchError';
  }
}

export class InvalidCanonicalLessonKeyMutationError extends Error {
  constructor() {
    super('Canonical lesson key cannot be changed.');
    this.name = 'InvalidCanonicalLessonKeyMutationError';
  }
}
