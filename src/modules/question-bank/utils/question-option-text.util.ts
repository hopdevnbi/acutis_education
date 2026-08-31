import { InvalidQuestionOptionTextError } from '../errors/question-bank.errors';

export const QUESTION_OPTION_TEXT_MAX_LENGTH = 512;

const HTML_TAG_PATTERN = /<[^>]+>/;

export function parseQuestionOptionText(rawText: string | null | undefined): string | null {
  if (rawText === undefined || rawText === null) {
    return null;
  }

  const text = rawText.trim();

  if (text.length === 0) {
    return null;
  }

  if (text.length > QUESTION_OPTION_TEXT_MAX_LENGTH) {
    throw new InvalidQuestionOptionTextError();
  }

  if (HTML_TAG_PATTERN.test(text)) {
    throw new InvalidQuestionOptionTextError();
  }

  return text;
}
