export class ClassScopeAccessDeniedError extends Error {
  constructor() {
    super('You do not have access to this class resource.');
    this.name = 'ClassScopeAccessDeniedError';
  }
}
