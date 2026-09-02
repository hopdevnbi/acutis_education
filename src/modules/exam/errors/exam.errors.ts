import type { ExamPublishValidationIssue } from '../interfaces/exam.interface';

export class InvalidExamIdError extends Error {
  constructor() {
    super('Invalid exam id.');
    this.name = 'InvalidExamIdError';
  }
}

export class ExamNotFoundError extends Error {
  constructor() {
    super('Exam not found.');
    this.name = 'ExamNotFoundError';
  }
}

export class InvalidExamCodeError extends Error {
  constructor() {
    super('Invalid exam code.');
    this.name = 'InvalidExamCodeError';
  }
}

export class ExamCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Exam code "${code}" already exists for this parish.`);
    this.name = 'ExamCodeAlreadyExistsError';
  }
}

export class ExamInactiveError extends Error {
  constructor() {
    super('Exam is inactive.');
    this.name = 'ExamInactiveError';
  }
}

export class ExamUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one exam field must be provided for update.');
    this.name = 'ExamUpdateRequiresFieldsError';
  }
}

export class InvalidExamVersionIdError extends Error {
  constructor() {
    super('Invalid exam version id.');
    this.name = 'InvalidExamVersionIdError';
  }
}

export class ExamVersionNotFoundError extends Error {
  constructor() {
    super('Exam version not found.');
    this.name = 'ExamVersionNotFoundError';
  }
}

export class ExamVersionExamMismatchError extends Error {
  constructor() {
    super('Exam version does not belong to the specified exam.');
    this.name = 'ExamVersionExamMismatchError';
  }
}

export class ExamDraftAlreadyExistsError extends Error {
  constructor() {
    super('A draft exam version already exists.');
    this.name = 'ExamDraftAlreadyExistsError';
  }
}

export class ExamVersionNotDraftError extends Error {
  constructor() {
    super('Exam version is not a draft.');
    this.name = 'ExamVersionNotDraftError';
  }
}

export class ExamVersionNotPublishedError extends Error {
  constructor() {
    super('Exam version is not published.');
    this.name = 'ExamVersionNotPublishedError';
  }
}

export class ExamVersionNotCloneableError extends Error {
  constructor() {
    super('Only published or archived exam versions can be cloned to draft.');
    this.name = 'ExamVersionNotCloneableError';
  }
}

export class ExamVersionNumberConflictError extends Error {
  constructor() {
    super('Exam version number conflict.');
    this.name = 'ExamVersionNumberConflictError';
  }
}

export class InvalidExamTitleError extends Error {
  constructor() {
    super('Invalid exam title.');
    this.name = 'InvalidExamTitleError';
  }
}

export class InvalidExamDescriptionError extends Error {
  constructor() {
    super('Invalid exam description.');
    this.name = 'InvalidExamDescriptionError';
  }
}

export class InvalidExamInstructionsError extends Error {
  constructor() {
    super('Invalid exam instructions.');
    this.name = 'InvalidExamInstructionsError';
  }
}

export class InvalidExamSourceLocaleError extends Error {
  constructor() {
    super('Invalid exam source locale.');
    this.name = 'InvalidExamSourceLocaleError';
  }
}

export class InvalidExamDurationError extends Error {
  constructor() {
    super('Invalid exam duration.');
    this.name = 'InvalidExamDurationError';
  }
}

export class InvalidExamMaxAttemptsError extends Error {
  constructor() {
    super('Invalid exam max attempts.');
    this.name = 'InvalidExamMaxAttemptsError';
  }
}

export class InvalidExamPassingScoreError extends Error {
  constructor() {
    super('Invalid exam passing score percent.');
    this.name = 'InvalidExamPassingScoreError';
  }
}

export class InvalidExamReviewPolicyError extends Error {
  constructor() {
    super('Invalid exam review policy.');
    this.name = 'InvalidExamReviewPolicyError';
  }
}

export class ExamVersionUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one exam version field must be provided for update.');
    this.name = 'ExamVersionUpdateRequiresFieldsError';
  }
}

export class ExamSourceLocaleImmutableError extends Error {
  constructor() {
    super('Exam source locale cannot be changed after published history exists.');
    this.name = 'ExamSourceLocaleImmutableError';
  }
}

export class InvalidExamVersionQuestionsError extends Error {
  constructor() {
    super('Invalid exam version question list.');
    this.name = 'InvalidExamVersionQuestionsError';
  }
}

export class ExamQuestionParishMismatchError extends Error {
  constructor() {
    super('One or more questions do not belong to the exam parish.');
    this.name = 'ExamQuestionParishMismatchError';
  }
}

export class ExamPublishValidationError extends Error {
  constructor(public readonly issues: readonly ExamPublishValidationIssue[]) {
    super('Exam version cannot be published due to validation issues.');
    this.name = 'ExamPublishValidationError';
  }
}

export class InvalidExamAssignmentIdError extends Error {
  constructor() {
    super('Invalid exam assignment id.');
    this.name = 'InvalidExamAssignmentIdError';
  }
}

export class ExamAssignmentNotFoundError extends Error {
  constructor() {
    super('Exam assignment not found.');
    this.name = 'ExamAssignmentNotFoundError';
  }
}

export class InvalidExamAssignmentWindowError extends Error {
  constructor() {
    super('Exam assignment closes at must be after opens at.');
    this.name = 'InvalidExamAssignmentWindowError';
  }
}

export class ExamAssignmentClassParishMismatchError extends Error {
  constructor() {
    super('Class does not belong to the specified parish.');
    this.name = 'ExamAssignmentClassParishMismatchError';
  }
}

export class ExamAssignmentUpdateRequiresFieldsError extends Error {
  constructor() {
    super('At least one exam assignment field must be provided for update.');
    this.name = 'ExamAssignmentUpdateRequiresFieldsError';
  }
}

export class ExamAssignmentVersionNotPublishedError extends Error {
  constructor() {
    super('Exam assignments require a published exam version.');
    this.name = 'ExamAssignmentVersionNotPublishedError';
  }
}

export class InvalidExamAttemptIdError extends Error {
  constructor() {
    super('Invalid exam attempt id.');
    this.name = 'InvalidExamAttemptIdError';
  }
}

export class ExamAttemptNotFoundError extends Error {
  constructor() {
    super('Exam attempt not found.');
    this.name = 'ExamAttemptNotFoundError';
  }
}

export class ExamAccessDeniedError extends Error {
  constructor() {
    super('Exam access denied.');
    this.name = 'ExamAccessDeniedError';
  }
}

export class ExamAssignmentNotOpenError extends Error {
  constructor() {
    super('Exam assignment is not open.');
    this.name = 'ExamAssignmentNotOpenError';
  }
}

export class ExamEnrollmentNotEligibleError extends Error {
  constructor() {
    super('Enrollment is not eligible for formal exam attempts.');
    this.name = 'ExamEnrollmentNotEligibleError';
  }
}

export class ExamAttemptLimitReachedError extends Error {
  constructor() {
    super('Maximum exam attempts reached for this assignment.');
    this.name = 'ExamAttemptLimitReachedError';
  }
}

export class ExamAttemptQuestionsNotReadyError extends Error {
  constructor() {
    super('Exam version questions are not ready for attempt generation.');
    this.name = 'ExamAttemptQuestionsNotReadyError';
  }
}

export class ExamIdempotencyConflictError extends Error {
  constructor() {
    super('Exam attempt idempotency conflict.');
    this.name = 'ExamIdempotencyConflictError';
  }
}

export class ExamAttemptQuestionNotFoundError extends Error {
  constructor() {
    super('Exam attempt question not found.');
    this.name = 'ExamAttemptQuestionNotFoundError';
  }
}

export class ExamAttemptNotInProgressError extends Error {
  constructor() {
    super('Exam attempt is not in progress.');
    this.name = 'ExamAttemptNotInProgressError';
  }
}

export class ExamAnswerInvalidError extends Error {
  constructor() {
    super('Exam answer is invalid.');
    this.name = 'ExamAnswerInvalidError';
  }
}

export class ExamAnswerIdempotencyConflictError extends Error {
  constructor() {
    super('Exam answer idempotency conflict.');
    this.name = 'ExamAnswerIdempotencyConflictError';
  }
}

export class ExamSubmitConflictError extends Error {
  constructor() {
    super('Exam submit conflict.');
    this.name = 'ExamSubmitConflictError';
  }
}

export class InvalidExamAttemptQuestionIdError extends Error {
  constructor() {
    super('Invalid exam attempt question id.');
    this.name = 'InvalidExamAttemptQuestionIdError';
  }
}
