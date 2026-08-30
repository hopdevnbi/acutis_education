import { InvalidClassNameError } from '../errors/class.errors';

export const CLASS_NAME_MAX_LENGTH = 128;

export function normalizeClassName(name: string): string {
  return name.trim();
}

export function isValidClassName(name: string): boolean {
  return name.length > 0 && name.length <= CLASS_NAME_MAX_LENGTH;
}

export function parseClassName(rawName: string): string {
  const normalizedName = normalizeClassName(rawName);

  if (!isValidClassName(normalizedName)) {
    throw new InvalidClassNameError();
  }

  return normalizedName;
}
