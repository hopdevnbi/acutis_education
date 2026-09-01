import { MAX_ACCEPT_LANGUAGE_ENTRIES } from './locale.constants';
import { parseLocale } from './parse-locale.util';

export interface ParsedAcceptLanguageEntry {
  readonly locale: string;
  readonly quality: number;
  readonly originalIndex: number;
}

function parseQuality(rawQuality: string | undefined): number {
  if (rawQuality === undefined) {
    return 1;
  }

  const parsed = Number.parseFloat(rawQuality.trim());

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return Number.NaN;
  }

  return parsed;
}

export function parseAcceptLanguageHeader(
  rawHeader: string | null | undefined,
): readonly ParsedAcceptLanguageEntry[] {
  if (rawHeader === null || rawHeader === undefined) {
    return [];
  }

  const trimmedHeader = rawHeader.trim();

  if (trimmedHeader.length === 0) {
    return [];
  }

  const entries: ParsedAcceptLanguageEntry[] = [];
  const segments = trimmedHeader.split(',').slice(0, MAX_ACCEPT_LANGUAGE_ENTRIES);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]?.trim();

    if (segment === undefined || segment.length === 0) {
      continue;
    }

    const [rawLocalePart, ...parameterParts] = segment.split(';');
    const rawLocale = rawLocalePart?.trim();

    if (rawLocale === undefined || rawLocale.length === 0) {
      continue;
    }

    if (rawLocale === '*') {
      continue;
    }

    let quality = 1;

    for (const parameterPart of parameterParts) {
      const trimmedParameter = parameterPart.trim();

      if (!trimmedParameter.toLowerCase().startsWith('q=')) {
        continue;
      }

      const parsedQuality = parseQuality(trimmedParameter.slice(2));

      if (Number.isNaN(parsedQuality)) {
        quality = Number.NaN;
        break;
      }

      quality = parsedQuality;
    }

    if (Number.isNaN(quality) || quality === 0) {
      continue;
    }

    try {
      entries.push({
        locale: parseLocale(rawLocale),
        quality,
        originalIndex: index,
      });
    } catch {
      continue;
    }
  }

  return [...entries].sort((left, right) => {
    if (right.quality !== left.quality) {
      return right.quality - left.quality;
    }

    return left.originalIndex - right.originalIndex;
  });
}
