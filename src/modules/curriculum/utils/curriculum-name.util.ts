import {
  InvalidCurriculumDescriptionError,
  InvalidCurriculumNameError,
} from '../errors/curriculum.errors';

export const CURRICULUM_NAME_MAX_LENGTH = 128;
export const CURRICULUM_DESCRIPTION_MAX_LENGTH = 512;

export function parseCurriculumName(rawName: string): string {
  const name = rawName.trim();

  if (name.length === 0 || name.length > CURRICULUM_NAME_MAX_LENGTH) {
    throw new InvalidCurriculumNameError();
  }

  return name;
}

export function parseCurriculumDescription(
  rawDescription: string | null | undefined,
): string | null {
  if (rawDescription === undefined || rawDescription === null) {
    return null;
  }

  const description = rawDescription.trim();

  if (description.length === 0) {
    return null;
  }

  if (description.length > CURRICULUM_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidCurriculumDescriptionError();
  }

  return description;
}
