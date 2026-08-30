import { InvalidAcademicYearNameError } from '../errors/academic-year.errors';

export const ACADEMIC_YEAR_NAME_MAX_LENGTH = 128;

export function parseAcademicYearName(rawName: string): string {
  const normalizedName = rawName.trim();

  if (normalizedName.length === 0 || normalizedName.length > ACADEMIC_YEAR_NAME_MAX_LENGTH) {
    throw new InvalidAcademicYearNameError();
  }

  return normalizedName;
}
