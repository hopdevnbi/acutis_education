export class ParishMembershipPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParishMembershipPrerequisiteError';
  }
}
