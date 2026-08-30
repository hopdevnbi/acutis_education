import { InvalidClassCodeError } from '../errors/class.errors';

export const CLASS_CODE_MAX_LENGTH = 32;
export const CLASS_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeClassCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidClassCode(code: string): boolean {
  return code.length > 0 && code.length <= CLASS_CODE_MAX_LENGTH && CLASS_CODE_PATTERN.test(code);
}

export function parseClassCode(rawCode: string): string {
  const normalizedCode = normalizeClassCode(rawCode);

  if (!isValidClassCode(normalizedCode)) {
    throw new InvalidClassCodeError();
  }

  return normalizedCode;
}
