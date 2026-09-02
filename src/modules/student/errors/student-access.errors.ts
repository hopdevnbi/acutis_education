export class StudentAccessDeniedError extends Error {
  constructor() {
    super('You do not have access to this student resource.');
    this.name = 'StudentAccessDeniedError';
  }
}

export class StudentManageAccessDeniedError extends Error {
  constructor() {
    super('You do not have permission to manage this student resource.');
    this.name = 'StudentManageAccessDeniedError';
  }
}

export class LearnerSelfScopeDeniedError extends Error {
  constructor() {
    super('You may only act as the linked student account for this learner action.');
    this.name = 'LearnerSelfScopeDeniedError';
  }
}
