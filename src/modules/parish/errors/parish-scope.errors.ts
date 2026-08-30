export class ParishScopeAccessDeniedError extends Error {
  constructor() {
    super('You do not have access to this parish resource.');
    this.name = 'ParishScopeAccessDeniedError';
  }
}
