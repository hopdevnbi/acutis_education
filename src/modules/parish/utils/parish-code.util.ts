import { InvalidParishCodeError } from '../errors/parish.errors';

export const PARISH_CODE_MAX_LENGTH = 32;
export const PARISH_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeParishCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidParishCode(code: string): boolean {
  return code.length > 0 && code.length <= PARISH_CODE_MAX_LENGTH && PARISH_CODE_PATTERN.test(code);
}

export function parseParishCode(rawCode: string): string {
  const normalizedCode = normalizeParishCode(rawCode);

  if (!isValidParishCode(normalizedCode)) {
    throw new InvalidParishCodeError();
  }

  return normalizedCode;
}
