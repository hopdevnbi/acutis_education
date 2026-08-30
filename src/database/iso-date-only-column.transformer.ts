import type { ValueTransformer } from 'typeorm';

const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatUtcDateOnly(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function normalizeIsoDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return formatUtcDateOnly(value);
  }

  const trimmedValue = value.trim();
  const match = ISO_DATE_ONLY_PATTERN.exec(trimmedValue);

  if (match === null) {
    return trimmedValue.slice(0, 10);
  }

  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);

  return formatUtcDateOnly(new Date(Date.UTC(year, month - 1, day)));
}

export const isoDateOnlyColumnTransformer: ValueTransformer = {
  to(value: string | Date | null | undefined): Date | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = normalizeIsoDateOnly(value);
    const match = ISO_DATE_ONLY_PATTERN.exec(normalizedValue);

    if (match === null) {
      throw new Error('Academic year date value must be an ISO date-only string.');
    }

    const year = Number.parseInt(match[1] ?? '', 10);
    const month = Number.parseInt(match[2] ?? '', 10);
    const day = Number.parseInt(match[3] ?? '', 10);

    return new Date(Date.UTC(year, month - 1, day));
  },
  from(value: string | Date | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    return normalizeIsoDateOnly(value);
  },
};
