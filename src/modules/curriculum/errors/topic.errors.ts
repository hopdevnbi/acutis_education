export class InvalidTopicIdError extends Error {
  constructor() {
    super('Invalid topic id.');
    this.name = 'InvalidTopicIdError';
  }
}

export class TopicNotFoundError extends Error {
  constructor() {
    super('Topic not found.');
    this.name = 'TopicNotFoundError';
  }
}

export class InvalidTopicCodeError extends Error {
  constructor() {
    super('Invalid topic code.');
    this.name = 'InvalidTopicCodeError';
  }
}

export class InvalidTopicTitleError extends Error {
  constructor() {
    super('Invalid topic title.');
    this.name = 'InvalidTopicTitleError';
  }
}

export class InvalidTopicDescriptionError extends Error {
  constructor() {
    super('Invalid topic description.');
    this.name = 'InvalidTopicDescriptionError';
  }
}

export class TopicCodeAlreadyExistsError extends Error {
  constructor(public readonly code: string) {
    super(`Topic code "${code}" already exists in this curriculum version.`);
    this.name = 'TopicCodeAlreadyExistsError';
  }
}

export class TopicNotEmptyError extends Error {
  constructor() {
    super('Topic cannot be deleted while lessons exist.');
    this.name = 'TopicNotEmptyError';
  }
}

export class InvalidTopicReorderError extends Error {
  constructor() {
    super('Invalid topic reorder request.');
    this.name = 'InvalidTopicReorderError';
  }
}
