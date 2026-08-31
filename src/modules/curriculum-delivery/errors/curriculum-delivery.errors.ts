export class CurriculumAssignedVersionNotPublishedError extends Error {
  constructor() {
    super('Assigned curriculum version is not published.');
    this.name = 'CurriculumAssignedVersionNotPublishedError';
  }
}

export class LessonNotInAssignedCurriculumError extends Error {
  constructor() {
    super('Lesson does not belong to the curriculum assigned for this context.');
    this.name = 'LessonNotInAssignedCurriculumError';
  }
}

export class PublishedLessonContentNotFoundError extends Error {
  constructor() {
    super('Published lesson content was not found.');
    this.name = 'PublishedLessonContentNotFoundError';
  }
}

export class DraftCurriculumDeliveryDeniedError extends Error {
  constructor() {
    super('Draft curriculum content is not available for learner delivery.');
    this.name = 'DraftCurriculumDeliveryDeniedError';
  }
}

export class ContextualMediaAssetNotReferencedError extends Error {
  constructor() {
    super('Media asset is not referenced by the requested lesson content.');
    this.name = 'ContextualMediaAssetNotReferencedError';
  }
}
