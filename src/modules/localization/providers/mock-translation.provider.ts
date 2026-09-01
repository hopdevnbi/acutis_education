import type {
  TranslatableUnit,
  TranslationBatchInput,
  TranslatedUnit,
} from './translation-provider.interface';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';
import type { TranslationProvider } from './translation-provider.interface';
import { validateProviderOutput } from './validate-provider-output.util';
import { DEFAULT_TRANSLATION_MAX_UNIT_CHARS } from '../config/translation.config.types';

function normalizeLocaleTag(locale: string): string {
  return locale.trim().toLowerCase();
}

function applyGlossaryTerms(
  text: string,
  terms: ReadonlyArray<{ sourceTerm: string; targetTerm: string; caseSensitive: boolean }>,
): string {
  let result = text;

  for (const term of terms) {
    if (term.caseSensitive) {
      result = result.split(term.sourceTerm).join(term.targetTerm);
      continue;
    }

    const pattern = new RegExp(escapeRegExp(term.sourceTerm), 'gi');
    result = result.replace(pattern, term.targetTerm);
  }

  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMockTranslation(
  unit: TranslatableUnit,
  sourceLocale: string,
  targetLocale: string,
): string {
  const prefix = `[${normalizeLocaleTag(sourceLocale)}->${normalizeLocaleTag(targetLocale)}]`;
  const contextSuffix =
    unit.context !== undefined && unit.context !== null && unit.context.trim().length > 0
      ? `(${unit.context.trim()})`
      : '';

  return `${prefix}${contextSuffix} ${unit.text}`.trim();
}

export class MockTranslationProvider implements TranslationProvider {
  readonly providerId = TranslationProviderId.Mock;

  private readonly glossaryTermsByVersionId = new Map<
    string,
    Array<{ sourceTerm: string; targetTerm: string; caseSensitive: boolean }>
  >();

  registerGlossaryTerms(
    glossaryVersionId: string,
    terms: ReadonlyArray<{ sourceTerm: string; targetTerm: string; caseSensitive: boolean }>,
  ): void {
    this.glossaryTermsByVersionId.set(glossaryVersionId, [...terms]);
  }

  translateBatch(input: TranslationBatchInput): Promise<TranslatedUnit[]> {
    const glossaryTerms =
      input.glossary?.glossaryVersionId !== undefined
        ? (this.glossaryTermsByVersionId.get(input.glossary.glossaryVersionId) ?? [])
        : [];

    const translatedUnits = input.units.map((unit) => {
      const baseText = buildMockTranslation(unit, input.sourceLocale, input.targetLocale);
      const text =
        glossaryTerms.length === 0 ? baseText : applyGlossaryTerms(baseText, glossaryTerms);

      return {
        id: unit.id,
        text,
      };
    });

    return Promise.resolve(
      validateProviderOutput(input.units, translatedUnits, DEFAULT_TRANSLATION_MAX_UNIT_CHARS),
    );
  }
}
