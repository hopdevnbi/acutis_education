import { normalizeUuid } from '../../../database/uuid-v4.util';
import type { ImmutableAssessmentSnapshot } from '../../question-bank/interfaces/question-bank.interface';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';
import type { LocalizedQuestionDisplayPayload } from '../interfaces/localization.interface';

function buildTranslatedMap(units: readonly TranslatedUnit[]): Map<string, string> {
  return new Map(units.map((unit) => [unit.id, unit.text]));
}

export function extractQuestionBankTranslatableUnits(
  snapshot: ImmutableAssessmentSnapshot,
): TranslatableUnit[] {
  const units: TranslatableUnit[] = [];

  if (snapshot.prompt.trim().length > 0) {
    units.push({ id: 'question.prompt', text: snapshot.prompt });
  }

  if (snapshot.instruction !== null && snapshot.instruction.trim().length > 0) {
    units.push({ id: 'question.instruction', text: snapshot.instruction });
  }

  for (const option of snapshot.options) {
    if (option.text !== null && option.text.trim().length > 0) {
      units.push({
        id: `option:${normalizeUuid(option.id)}:text`,
        text: option.text,
      });
    }
  }

  return units;
}

export function buildQuestionBankTranslationPayload(
  snapshot: ImmutableAssessmentSnapshot,
  translatedUnits: readonly TranslatedUnit[],
): Record<string, unknown> {
  const translated = buildTranslatedMap(translatedUnits);

  return {
    prompt: translated.get('question.prompt') ?? snapshot.prompt,
    instruction: translated.get('question.instruction') ?? snapshot.instruction ?? null,
    options: snapshot.options.map((option) => ({
      id: option.id,
      text: translated.get(`option:${normalizeUuid(option.id)}:text`) ?? option.text,
    })),
  };
}

export function applyQuestionBankTranslation(
  snapshot: ImmutableAssessmentSnapshot,
  payload: Record<string, unknown>,
  explanation: string | null,
): LocalizedQuestionDisplayPayload {
  const prompt = readStringField(payload, 'prompt') ?? snapshot.prompt;
  const instruction =
    payload['instruction'] === undefined
      ? snapshot.instruction
      : readNullableStringField(payload, 'instruction');
  const optionsPayload = payload['options'];

  if (!Array.isArray(optionsPayload)) {
    throw new Error('Question translation payload must include options array.');
  }

  const optionTextById = new Map<string, string | null>();

  for (const entry of optionsPayload) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('Question translation option entry must be an object.');
    }

    const optionId = (entry as { id?: unknown }).id;
    const optionText = (entry as { text?: unknown }).text;

    if (typeof optionId !== 'string') {
      throw new Error('Question translation option id must be a string.');
    }

    optionTextById.set(
      normalizeUuid(optionId),
      optionText === null ? null : typeof optionText === 'string' ? optionText : null,
    );
  }

  return {
    prompt,
    instruction,
    explanation,
    options: snapshot.options.map((option) => ({
      id: option.id,
      text: optionTextById.get(normalizeUuid(option.id)) ?? option.text,
    })),
  };
}

function readStringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];

  if (typeof value !== 'string') {
    return null;
  }

  return value;
}

function readNullableStringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected string or null field "${key}" in question translation payload.`);
  }

  return value;
}
