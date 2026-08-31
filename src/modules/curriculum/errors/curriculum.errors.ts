export class InvalidCurriculumIdError extends Error {
  constructor() {
    super('Invalid curriculum id.');
    this.name = 'InvalidCurriculumIdError';
  }
}

export class CurriculumNotFoundError extends Error {
  constructor() {
    super('Curriculum not found.');
    this.name = 'CurriculumNotFoundError';
  }
}

export class InvalidCurriculumCodeError extends Error {
  constructor() {
    super('Invalid curriculum code.');
    this.name = 'InvalidCurriculumCodeError';
  }
}

export class InvalidCurriculumSourceLocaleError extends Error {
  constructor() {
    super('Invalid curriculum source locale.');
    this.name = 'InvalidCurriculumSourceLocaleError';
  }
}

export class InvalidCurriculumNameError extends Error {
  constructor() {
    super('Invalid curriculum name.');
    this.name = 'InvalidCurriculumNameError';
  }
}

export class InvalidCurriculumDescriptionError extends Error {
  constructor() {
    super('Invalid curriculum description.');
    this.name = 'InvalidCurriculumDescriptionError';
  }
}

export class CurriculumCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Curriculum code "${code}" already exists for this parish and catechism level.`);
    this.name = 'CurriculumCodeAlreadyExistsError';
  }
}

export class CurriculumInactiveError extends Error {
  constructor() {
    super('Curriculum is inactive.');
    this.name = 'CurriculumInactiveError';
  }
}

export class CurriculumStructuralFieldImmutableError extends Error {
  constructor() {
    super('Curriculum parish and catechism level cannot be changed.');
    this.name = 'CurriculumStructuralFieldImmutableError';
  }
}

export class CurriculumSourceLocaleImmutableError extends Error {
  constructor() {
    super('Curriculum source locale cannot be changed after published history exists.');
    this.name = 'CurriculumSourceLocaleImmutableError';
  }
}

export class CurriculumUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one curriculum field must be provided for update.');
    this.name = 'CurriculumUpdateRequiresFieldsError';
  }
}

export class InvalidCurriculumVersionIdError extends Error {
  constructor() {
    super('Invalid curriculum version id.');
    this.name = 'InvalidCurriculumVersionIdError';
  }
}

export class CurriculumVersionNotFoundError extends Error {
  constructor() {
    super('Curriculum version not found.');
    this.name = 'CurriculumVersionNotFoundError';
  }
}

export class CurriculumDraftAlreadyExistsError extends Error {
  constructor() {
    super('A draft curriculum version already exists.');
    this.name = 'CurriculumDraftAlreadyExistsError';
  }
}

export class CurriculumVersionNotDraftError extends Error {
  constructor() {
    super('Curriculum version is not a draft.');
    this.name = 'CurriculumVersionNotDraftError';
  }
}

export class CurriculumVersionNumberConflictError extends Error {
  constructor() {
    super('Curriculum version number conflict.');
    this.name = 'CurriculumVersionNumberConflictError';
  }
}

export class CurriculumCatechismLevelInactiveError extends Error {
  constructor() {
    super('Catechism level is not active.');
    this.name = 'CurriculumCatechismLevelInactiveError';
  }
}

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

export class CurriculumVersionNotPublishedError extends Error {
  constructor() {
    super('Curriculum version is not published.');
    this.name = 'CurriculumVersionNotPublishedError';
  }
}

export class CurriculumAssignmentNotFoundError extends Error {
  constructor() {
    super('Curriculum assignment not found.');
    this.name = 'CurriculumAssignmentNotFoundError';
  }
}

export interface CurriculumPublishValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly resourceId?: string;
  readonly path?: string;
}

export class CurriculumPublishValidationError extends Error {
  constructor(public readonly issues: readonly CurriculumPublishValidationIssue[]) {
    super('Curriculum version cannot be published due to validation issues.');
    this.name = 'CurriculumPublishValidationError';
  }
}

export class CurriculumVersionNotCloneableError extends Error {
  constructor() {
    super('Curriculum version cannot be cloned to draft.');
    this.name = 'CurriculumVersionNotCloneableError';
  }
}

export class CurriculumAssignmentVersionMismatchError extends Error {
  constructor() {
    super('Curriculum version does not match parish and catechism level.');
    this.name = 'CurriculumAssignmentVersionMismatchError';
  }
}

export class CurriculumAssignmentAcademicYearNotDeliverableError extends Error {
  constructor() {
    super('Academic year is not deliverable for curriculum assignment.');
    this.name = 'CurriculumAssignmentAcademicYearNotDeliverableError';
  }
}

export class InvalidCurriculumAssignmentInputError extends Error {
  constructor() {
    super('Invalid curriculum assignment input.');
    this.name = 'InvalidCurriculumAssignmentInputError';
  }
}

export class CanonicalLessonKeyNotInCurriculumError extends Error {
  constructor() {
    super('Canonical lesson key does not belong to the curriculum.');
    this.name = 'CanonicalLessonKeyNotInCurriculumError';
  }
}

export class CurriculumVersionCurriculumMismatchError extends Error {
  constructor() {
    super('Curriculum version does not belong to the curriculum.');
    this.name = 'CurriculumVersionCurriculumMismatchError';
  }
}
