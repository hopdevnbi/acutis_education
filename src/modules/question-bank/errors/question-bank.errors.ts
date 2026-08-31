export class InvalidQuestionIdError extends Error {
  constructor() {
    super('Invalid question id.');
    this.name = 'InvalidQuestionIdError';
  }
}

export class QuestionNotFoundError extends Error {
  constructor() {
    super('Question not found.');
    this.name = 'QuestionNotFoundError';
  }
}

export class InvalidQuestionCodeError extends Error {
  constructor() {
    super('Invalid question code.');
    this.name = 'InvalidQuestionCodeError';
  }
}

export class QuestionCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Question code "${code}" already exists for this parish.`);
    this.name = 'QuestionCodeAlreadyExistsError';
  }
}

export class InvalidQuestionSourceLocaleError extends Error {
  constructor() {
    super('Invalid question source locale.');
    this.name = 'InvalidQuestionSourceLocaleError';
  }
}

export class QuestionInactiveError extends Error {
  constructor() {
    super('Question is inactive.');
    this.name = 'QuestionInactiveError';
  }
}

export class QuestionParishImmutableError extends Error {
  constructor() {
    super('Question parish cannot be changed.');
    this.name = 'QuestionParishImmutableError';
  }
}

export class QuestionSourceLocaleImmutableError extends Error {
  constructor() {
    super('Question source locale cannot be changed after published history exists.');
    this.name = 'QuestionSourceLocaleImmutableError';
  }
}

export class QuestionUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one question field must be provided for update.');
    this.name = 'QuestionUpdateRequiresFieldsError';
  }
}

export class InvalidQuestionVersionIdError extends Error {
  constructor() {
    super('Invalid question version id.');
    this.name = 'InvalidQuestionVersionIdError';
  }
}

export class QuestionVersionNotFoundError extends Error {
  constructor() {
    super('Question version not found.');
    this.name = 'QuestionVersionNotFoundError';
  }
}

export class QuestionDraftAlreadyExistsError extends Error {
  constructor() {
    super('A draft question version already exists.');
    this.name = 'QuestionDraftAlreadyExistsError';
  }
}

export class QuestionVersionNotDraftError extends Error {
  constructor() {
    super('Question version is not a draft.');
    this.name = 'QuestionVersionNotDraftError';
  }
}

export class QuestionVersionNotCloneableError extends Error {
  constructor() {
    super('Question version cannot be cloned to draft.');
    this.name = 'QuestionVersionNotCloneableError';
  }
}

export class QuestionCloneSourceInvalidError extends Error {
  constructor() {
    super('Question version clone source is invalid.');
    this.name = 'QuestionCloneSourceInvalidError';
  }
}

export class QuestionTypeChangeNotAllowedError extends Error {
  constructor() {
    super('Question type cannot be changed while options or correct answers exist.');
    this.name = 'QuestionTypeChangeNotAllowedError';
  }
}

export class QuestionVersionNotGradableError extends Error {
  constructor() {
    super('Question version cannot be graded.');
    this.name = 'QuestionVersionNotGradableError';
  }
}

export class QuestionVersionNotDeliverableError extends Error {
  constructor() {
    super('Question version is not deliverable to learners.');
    this.name = 'QuestionVersionNotDeliverableError';
  }
}

export class QuestionNoPublishedVersionError extends Error {
  constructor() {
    super('Question has no published version available for selection.');
    this.name = 'QuestionNoPublishedVersionError';
  }
}

export class InvalidGradeAnswerInputError extends Error {
  constructor() {
    super('Invalid grade answer input.');
    this.name = 'InvalidGradeAnswerInputError';
  }
}

export class QuestionVersionNumberConflictError extends Error {
  constructor() {
    super('Question version number conflict.');
    this.name = 'QuestionVersionNumberConflictError';
  }
}

export class QuestionVersionNotPublishedError extends Error {
  constructor() {
    super('Question version is not published.');
    this.name = 'QuestionVersionNotPublishedError';
  }
}

export class QuestionBlankDraftNotAllowedError extends Error {
  constructor() {
    super('Blank draft cannot be created after published or archived history exists.');
    this.name = 'QuestionBlankDraftNotAllowedError';
  }
}

export class InvalidQuestionPromptError extends Error {
  constructor() {
    super('Invalid question prompt.');
    this.name = 'InvalidQuestionPromptError';
  }
}

export class InvalidQuestionInstructionError extends Error {
  constructor() {
    super('Invalid question instruction.');
    this.name = 'InvalidQuestionInstructionError';
  }
}

export class InvalidQuestionExplanationError extends Error {
  constructor() {
    super('Invalid question explanation.');
    this.name = 'InvalidQuestionExplanationError';
  }
}

export class InvalidQuestionTypeError extends Error {
  constructor() {
    super('Invalid question type.');
    this.name = 'InvalidQuestionTypeError';
  }
}

export class InvalidQuestionDifficultyError extends Error {
  constructor() {
    super('Invalid question difficulty.');
    this.name = 'InvalidQuestionDifficultyError';
  }
}

export class InvalidQuestionOptionCodeError extends Error {
  constructor() {
    super('Invalid question option code.');
    this.name = 'InvalidQuestionOptionCodeError';
  }
}

export class InvalidQuestionOptionTextError extends Error {
  constructor() {
    super('Invalid question option text.');
    this.name = 'InvalidQuestionOptionTextError';
  }
}

export class InvalidQuestionOptionRepresentationError extends Error {
  constructor() {
    super('Question option requires text or media representation.');
    this.name = 'InvalidQuestionOptionRepresentationError';
  }
}

export class DuplicateQuestionOptionCodeError extends Error {
  constructor() {
    super('Duplicate question option code within version.');
    this.name = 'DuplicateQuestionOptionCodeError';
  }
}

export class InvalidQuestionOptionCountError extends Error {
  constructor() {
    super('Invalid question option count.');
    this.name = 'InvalidQuestionOptionCountError';
  }
}

export class InvalidQuestionOptionSortOrderError extends Error {
  constructor() {
    super('Invalid question option sort order.');
    this.name = 'InvalidQuestionOptionSortOrderError';
  }
}

export class InvalidQuestionOptionIdError extends Error {
  constructor() {
    super('Invalid question option id.');
    this.name = 'InvalidQuestionOptionIdError';
  }
}

export class QuestionOptionNotFoundError extends Error {
  constructor() {
    super('Question option not found for this version.');
    this.name = 'QuestionOptionNotFoundError';
  }
}

export class InvalidCorrectOptionIdsError extends Error {
  constructor() {
    super('One or more correct option ids are invalid for this version.');
    this.name = 'InvalidCorrectOptionIdsError';
  }
}

export class InvalidQuestionMediaJsonError extends Error {
  constructor() {
    super('Invalid question media JSON.');
    this.name = 'InvalidQuestionMediaJsonError';
  }
}

export class InvalidAnswerDefinitionJsonError extends Error {
  constructor() {
    super('Answer definition JSON is not allowed for objective question types.');
    this.name = 'InvalidAnswerDefinitionJsonError';
  }
}

export interface QuestionPublishValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly resourceId?: string;
  readonly path?: string;
}

export class QuestionPublishValidationError extends Error {
  constructor(public readonly issues: readonly QuestionPublishValidationIssue[]) {
    super('Question version cannot be published due to validation issues.');
    this.name = 'QuestionPublishValidationError';
  }
}

export class InvalidQuestionTagIdError extends Error {
  constructor() {
    super('Invalid question tag id.');
    this.name = 'InvalidQuestionTagIdError';
  }
}

export class QuestionTagNotFoundError extends Error {
  constructor() {
    super('Question tag not found.');
    this.name = 'QuestionTagNotFoundError';
  }
}

export class InvalidQuestionTagCodeError extends Error {
  constructor() {
    super('Invalid question tag code.');
    this.name = 'InvalidQuestionTagCodeError';
  }
}

export class InvalidQuestionTagNameError extends Error {
  constructor() {
    super('Invalid question tag name.');
    this.name = 'InvalidQuestionTagNameError';
  }
}

export class QuestionTagCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Question tag code "${code}" already exists for this parish.`);
    this.name = 'QuestionTagCodeAlreadyExistsError';
  }
}

export class QuestionTagInactiveError extends Error {
  constructor() {
    super('Question tag is inactive.');
    this.name = 'QuestionTagInactiveError';
  }
}

export class QuestionTagParishMismatchError extends Error {
  constructor() {
    super('Question tag does not belong to the question parish.');
    this.name = 'QuestionTagParishMismatchError';
  }
}

export class QuestionTagLinkAlreadyExistsError extends Error {
  constructor() {
    super('Question tag link already exists.');
    this.name = 'QuestionTagLinkAlreadyExistsError';
  }
}

export class QuestionTagLinkNotFoundError extends Error {
  constructor() {
    super('Question tag link not found.');
    this.name = 'QuestionTagLinkNotFoundError';
  }
}

export class InvalidQuestionCurriculumLinkIdError extends Error {
  constructor() {
    super('Invalid question curriculum link id.');
    this.name = 'InvalidQuestionCurriculumLinkIdError';
  }
}

export class QuestionCurriculumLinkNotFoundError extends Error {
  constructor() {
    super('Question curriculum link not found.');
    this.name = 'QuestionCurriculumLinkNotFoundError';
  }
}

export class QuestionCurriculumLinkAlreadyExistsError extends Error {
  constructor() {
    super('Question curriculum link already exists.');
    this.name = 'QuestionCurriculumLinkAlreadyExistsError';
  }
}

export class InvalidQuestionCurriculumLinkInputError extends Error {
  constructor() {
    super('Invalid question curriculum link input.');
    this.name = 'InvalidQuestionCurriculumLinkInputError';
  }
}

export class QuestionCurriculumParishMismatchError extends Error {
  constructor() {
    super('Curriculum does not belong to the question parish.');
    this.name = 'QuestionCurriculumParishMismatchError';
  }
}
