export class InvalidLocaleError extends Error {
  constructor(message = 'Locale must be a valid BCP 47-like tag.') {
    super(message);
    this.name = 'InvalidLocaleError';
  }
}
