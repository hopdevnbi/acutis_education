export function calculateCompletionRatio(completed: number, assigned: number): number {
  if (assigned <= 0) {
    return 0;
  }

  return completed / assigned;
}
