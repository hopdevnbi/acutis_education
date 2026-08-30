const DURATION_PATTERN = /^(\d+)([smhd])$/;

export function parseDurationToSeconds(duration: string): number {
  const normalizedDuration = duration.trim();
  const match = DURATION_PATTERN.exec(normalizedDuration);

  if (match === null) {
    throw new Error(`Invalid JWT_ACCESS_EXPIRES_IN value: ${duration}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86_400;
    default:
      throw new Error(`Invalid JWT_ACCESS_EXPIRES_IN value: ${duration}`);
  }
}
