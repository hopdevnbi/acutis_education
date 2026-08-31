export function buildClassLessonMediaContentPath(
  classId: string,
  lessonId: string,
  assetId: string,
): string {
  return `/api/v1/classes/${classId}/lessons/${lessonId}/media/${assetId}/content`;
}

export function buildEnrollmentLessonMediaContentPath(
  enrollmentId: string,
  lessonId: string,
  assetId: string,
): string {
  return `/api/v1/enrollments/${enrollmentId}/lessons/${lessonId}/media/${assetId}/content`;
}
