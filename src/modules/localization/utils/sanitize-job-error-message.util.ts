export function sanitizeJobErrorMessage(message: string | null | undefined): string | null {
  if (message === undefined || message === null) {
    return null;
  }

  const trimmed = message
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);

      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, 1000);
}
