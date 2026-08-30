export const PASSWORD_MIN_LENGTH = 12 as const;
export const PASSWORD_MAX_LENGTH = 128 as const;

export const PASSWORD_POLICY_MESSAGES = {
  tooShort: `Password must be at least ${String(PASSWORD_MIN_LENGTH)} characters long.`,
  tooLong: `Password must be at most ${String(PASSWORD_MAX_LENGTH)} characters long.`,
} as const;

export function validatePasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(PASSWORD_POLICY_MESSAGES.tooShort);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(PASSWORD_POLICY_MESSAGES.tooLong);
  }
}
