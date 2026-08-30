const MAX_ORIGINAL_FILE_NAME_LENGTH = 260;
const FALLBACK_FILE_NAME = 'upload.bin';

const PATH_SEPARATOR_PATTERN = /[\\/]/g;

function stripControlCharacters(value: string): string {
  return value
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);

      return code > 0x1f && code !== 0x7f;
    })
    .join('');
}

export function sanitizeOriginalFileName(rawValue: string): string {
  const withoutSeparators = rawValue.replace(PATH_SEPARATOR_PATTERN, '');
  const withoutControlChars = stripControlCharacters(withoutSeparators);
  const withoutLeadingDots = withoutControlChars.replace(/^\.+/, '').trim();

  if (withoutLeadingDots.length === 0) {
    return FALLBACK_FILE_NAME;
  }

  if (withoutLeadingDots.length <= MAX_ORIGINAL_FILE_NAME_LENGTH) {
    return withoutLeadingDots;
  }

  return withoutLeadingDots.slice(0, MAX_ORIGINAL_FILE_NAME_LENGTH);
}
