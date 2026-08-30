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
