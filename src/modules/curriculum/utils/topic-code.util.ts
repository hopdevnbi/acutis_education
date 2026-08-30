import { InvalidTopicCodeError } from '../errors/topic.errors';

export const TOPIC_CODE_MAX_LENGTH = 32;
export const TOPIC_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseTopicCode(rawCode: string | null | undefined): string | null {
  if (rawCode === undefined || rawCode === null) {
    return null;
  }

  const code = rawCode.trim().toLowerCase();

  if (code.length === 0) {
    return null;
  }

  if (code.length > TOPIC_CODE_MAX_LENGTH || !TOPIC_CODE_PATTERN.test(code)) {
    throw new InvalidTopicCodeError();
  }

  return code;
}
