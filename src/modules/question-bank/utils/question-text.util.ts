import {
  InvalidQuestionExplanationError,
  InvalidQuestionInstructionError,
  InvalidQuestionPromptError,
  InvalidQuestionTagNameError,
} from '../errors/question-bank.errors';

export const QUESTION_PROMPT_MAX_LENGTH = 2000;
export const QUESTION_INSTRUCTION_MAX_LENGTH = 1000;
export const QUESTION_EXPLANATION_MAX_LENGTH = 2000;
export const QUESTION_TAG_NAME_MAX_LENGTH = 128;

const HTML_TAG_PATTERN = /<[^>]+>/;

function assertNoHtml(value: string, errorFactory: () => Error): void {
  if (HTML_TAG_PATTERN.test(value)) {
    throw errorFactory();
  }
}

export function parseQuestionPrompt(rawPrompt: string | undefined): string {
  const prompt = (rawPrompt ?? '').trim();

  if (prompt.length > QUESTION_PROMPT_MAX_LENGTH) {
    throw new InvalidQuestionPromptError();
  }

  assertNoHtml(prompt, () => new InvalidQuestionPromptError());

  return prompt;
}

export function parseQuestionInstruction(rawInstruction: string | null | undefined): string | null {
  if (rawInstruction === undefined || rawInstruction === null) {
    return null;
  }

  const instruction = rawInstruction.trim();

  if (instruction.length === 0) {
    return null;
  }

  if (instruction.length > QUESTION_INSTRUCTION_MAX_LENGTH) {
    throw new InvalidQuestionInstructionError();
  }

  assertNoHtml(instruction, () => new InvalidQuestionInstructionError());

  return instruction;
}

export function parseQuestionExplanation(rawExplanation: string | null | undefined): string | null {
  if (rawExplanation === undefined || rawExplanation === null) {
    return null;
  }

  const explanation = rawExplanation.trim();

  if (explanation.length === 0) {
    return null;
  }

  if (explanation.length > QUESTION_EXPLANATION_MAX_LENGTH) {
    throw new InvalidQuestionExplanationError();
  }

  assertNoHtml(explanation, () => new InvalidQuestionExplanationError());

  return explanation;
}

export function parseQuestionTagName(rawName: string): string {
  const name = rawName.trim();

  if (name.length === 0 || name.length > QUESTION_TAG_NAME_MAX_LENGTH) {
    throw new InvalidQuestionTagNameError();
  }

  assertNoHtml(name, () => new InvalidQuestionTagNameError());

  return name;
}
