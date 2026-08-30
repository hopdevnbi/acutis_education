import { InvalidRoleCodeError } from '../errors/access-control.errors';

export const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
export const ROLE_CODE_MAX_LENGTH = 64;
export const ROLE_NAME_MAX_LENGTH = 128;

export function normalizeRoleCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidRoleCode(code: string): boolean {
  return code.length > 0 && code.length <= ROLE_CODE_MAX_LENGTH && ROLE_CODE_PATTERN.test(code);
}

export function parseRoleCode(rawCode: string): string {
  const normalizedCode = normalizeRoleCode(rawCode);

  if (!isValidRoleCode(normalizedCode)) {
    throw new InvalidRoleCodeError();
  }

  return normalizedCode;
}

export function normalizeRoleName(name: string): string {
  return name.trim();
}

export function isValidRoleName(name: string): boolean {
  return name.length > 0 && name.length <= ROLE_NAME_MAX_LENGTH;
}
