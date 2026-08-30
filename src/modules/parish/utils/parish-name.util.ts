import { InvalidParishNameError } from '../errors/parish.errors';

export const PARISH_NAME_MAX_LENGTH = 128;

export function normalizeParishName(name: string): string {
  return name.trim();
}

export function isValidParishName(name: string): boolean {
  return name.length > 0 && name.length <= PARISH_NAME_MAX_LENGTH;
}

export function parseParishName(rawName: string): string {
  const normalizedName = normalizeParishName(rawName);

  if (!isValidParishName(normalizedName)) {
    throw new InvalidParishNameError();
  }

  return normalizedName;
}
