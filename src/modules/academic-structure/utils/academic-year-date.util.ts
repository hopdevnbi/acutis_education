import { InvalidAcademicYearDateRangeError } from '../errors/academic-year.errors';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDateOnly(rawValue: string): string {
  const trimmedValue = rawValue.trim();

  if (!ISO_DATE_PATTERN.test(trimmedValue)) {
    throw new InvalidAcademicYearDateRangeError();
  }

  const [yearPart, monthPart, dayPart] = trimmedValue.split('-');
  const year = Number.parseInt(yearPart ?? '', 10);
  const month = Number.parseInt(monthPart ?? '', 10);
  const day = Number.parseInt(dayPart ?? '', 10);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new InvalidAcademicYearDateRangeError();
  }

  return trimmedValue;
}

export function assertStartDateBeforeEndDate(startDate: string, endDate: string): void {
  if (startDate >= endDate) {
    throw new InvalidAcademicYearDateRangeError();
  }
}
