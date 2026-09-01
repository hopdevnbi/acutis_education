import { InvalidLocaleError } from '../../../common/locale/locale.errors';
import { normalizeLocale, parseLocale } from '../../../common/locale/parse-locale.util';
import { InvalidCurriculumSourceLocaleError } from '../errors/curriculum.errors';

export function normalizeSourceLocale(rawLocale: string): string {
  try {
    return normalizeLocale(rawLocale);
  } catch (error: unknown) {
    if (error instanceof InvalidLocaleError) {
      throw new InvalidCurriculumSourceLocaleError();
    }

    throw error;
  }
}

export function parseSourceLocale(rawLocale: string): string {
  try {
    return parseLocale(rawLocale);
  } catch (error: unknown) {
    if (error instanceof InvalidLocaleError) {
      throw new InvalidCurriculumSourceLocaleError();
    }

    throw error;
  }
}
