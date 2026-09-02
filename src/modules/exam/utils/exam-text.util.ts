import {
  InvalidExamDescriptionError,
  InvalidExamInstructionsError,
  InvalidExamTitleError,
} from '../errors/exam.errors';

export const EXAM_TITLE_MAX_LENGTH = 256;
export const EXAM_DESCRIPTION_MAX_LENGTH = 512;

export function parseExamTitle(rawTitle: string): string {
  const title = rawTitle.trim();

  if (title.length === 0 || title.length > EXAM_TITLE_MAX_LENGTH) {
    throw new InvalidExamTitleError();
  }

  return title;
}

export function parseExamDescription(rawDescription: string | null | undefined): string | null {
  if (rawDescription === undefined || rawDescription === null) {
    return null;
  }

  const description = rawDescription.trim();

  if (description.length === 0) {
    return null;
  }

  if (description.length > EXAM_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidExamDescriptionError();
  }

  return description;
}

export function parseExamInstructions(rawInstructions: string | null | undefined): string | null {
  if (rawInstructions === undefined || rawInstructions === null) {
    return null;
  }

  const instructions = rawInstructions.trim();

  if (instructions.length === 0) {
    return null;
  }

  if (instructions.length > 32_000) {
    throw new InvalidExamInstructionsError();
  }

  return instructions;
}
