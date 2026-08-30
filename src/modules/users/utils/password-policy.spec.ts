import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGES,
  validatePasswordPolicy,
} from './password-policy';

describe('password-policy', () => {
  it('accepts passwords within the configured length bounds', () => {
    expect(() => {
      validatePasswordPolicy('a'.repeat(PASSWORD_MIN_LENGTH));
    }).not.toThrow();
  });

  it('rejects passwords shorter than the minimum length', () => {
    expect(() => {
      validatePasswordPolicy('a'.repeat(PASSWORD_MIN_LENGTH - 1));
    }).toThrow(PASSWORD_POLICY_MESSAGES.tooShort);
  });

  it('rejects passwords longer than the maximum length', () => {
    expect(() => {
      validatePasswordPolicy('a'.repeat(PASSWORD_MAX_LENGTH + 1));
    }).toThrow(PASSWORD_POLICY_MESSAGES.tooLong);
  });
});
