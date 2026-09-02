import { InvalidLocaleError } from '../../../common/locale/locale.errors';
import { normalizeLocale, parseLocale } from '../../../common/locale/parse-locale.util';
import { InvalidExamSourceLocaleError } from '../errors/exam.errors';

export function normalizeExamSourceLocale(rawLocale: string): string {
  try {
    return normalizeLocale(rawLocale);
  } catch (error: unknown) {
    if (error instanceof InvalidLocaleError) {
      throw new InvalidExamSourceLocaleError();
    }

    throw error;
  }
}

export function parseExamSourceLocale(rawLocale: string): string {
  try {
    return parseLocale(rawLocale);
  } catch (error: unknown) {
    if (error instanceof InvalidLocaleError) {
      throw new InvalidExamSourceLocaleError();
    }

    throw error;
  }
}
