import { InvalidPermissionCodeError } from '../errors/access-control.errors';

export const PERMISSION_CODE_PATTERN = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;
export const PERMISSION_CODE_MAX_LENGTH = 128;
export const PERMISSION_NAME_MAX_LENGTH = 128;

export function normalizePermissionCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidPermissionCode(code: string): boolean {
  return (
    code.length > 0 &&
    code.length <= PERMISSION_CODE_MAX_LENGTH &&
    PERMISSION_CODE_PATTERN.test(code)
  );
}

export function parsePermissionCode(rawCode: string): string {
  const normalizedCode = normalizePermissionCode(rawCode);

  if (!isValidPermissionCode(normalizedCode)) {
    throw new InvalidPermissionCodeError();
  }

  return normalizedCode;
}

export function normalizePermissionName(name: string): string {
  return name.trim();
}

export function isValidPermissionName(name: string): boolean {
  return name.length > 0 && name.length <= PERMISSION_NAME_MAX_LENGTH;
}
