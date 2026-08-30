import { InvalidTopicDescriptionError, InvalidTopicTitleError } from '../errors/topic.errors';

export const TOPIC_TITLE_MAX_LENGTH = 256;
export const TOPIC_DESCRIPTION_MAX_LENGTH = 1024;

export function parseTopicTitle(rawTitle: string): string {
  const title = rawTitle.trim();

  if (title.length === 0 || title.length > TOPIC_TITLE_MAX_LENGTH) {
    throw new InvalidTopicTitleError();
  }

  return title;
}

export function parseTopicDescription(rawDescription: string | null | undefined): string | null {
  if (rawDescription === undefined || rawDescription === null) {
    return null;
  }

  const description = rawDescription.trim();

  if (description.length === 0) {
    return null;
  }

  if (description.length > TOPIC_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidTopicDescriptionError();
  }

  return description;
}
