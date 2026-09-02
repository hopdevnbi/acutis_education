export function computeExamScorePercent(correctCount: number, questionCount: number): string {
  if (questionCount <= 0) {
    return '0.00';
  }

  const percent = Math.round((100 * correctCount) / questionCount);

  return percent.toFixed(2);
}

export function computeExamPassed(
  scorePercent: string,
  passingScorePercent: string | null,
): boolean | null {
  if (passingScorePercent === null) {
    return null;
  }

  return Number(scorePercent) >= Number(passingScorePercent);
}
