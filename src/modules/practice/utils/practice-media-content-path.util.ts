export function buildPracticeSessionQuestionMediaContentPath(
  sessionId: string,
  sessionQuestionId: string,
  assetId: string,
): string {
  return `/api/v1/practice-sessions/${sessionId}/questions/${sessionQuestionId}/media/${assetId}/content`;
}
