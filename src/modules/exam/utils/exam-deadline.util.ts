export function computeExamAttemptDeadlineAt(
  startedAt: Date,
  durationMinutes: number,
  assignmentClosesAt: Date,
): Date {
  const durationDeadline = new Date(startedAt.getTime() + durationMinutes * 60_000);

  return durationDeadline.getTime() <= assignmentClosesAt.getTime()
    ? durationDeadline
    : assignmentClosesAt;
}
