export interface PracticeProgressFilters {
  readonly curriculumId: string | null;
  readonly canonicalLessonKey: string | null;
  readonly from: Date | null;
  readonly to: Date | null;
}

export interface PracticeProgressStandardMetrics {
  readonly sessionsCompleted: number;
  readonly inProgressSessions: number;
  readonly abandonedSessions: number;
  readonly questionsAttempted: number;
  readonly firstAttemptCorrect: number;
  readonly finalCorrect: number;
  readonly firstAttemptAccuracy: number;
  readonly finalAccuracy: number;
}

export interface PracticeProgressReviewMetrics {
  readonly sessionsCompleted: number;
  readonly questionsAttempted: number;
  readonly finalCorrect: number;
  readonly finalAccuracy: number;
  readonly uniqueQuestionVersionsReviewed: number;
}

export interface EnrollmentPracticeProgressSnapshot {
  readonly enrollmentId: string;
  readonly filters: PracticeProgressFilters;
  readonly standard: PracticeProgressStandardMetrics;
  readonly review: PracticeProgressReviewMetrics;
  readonly lastPracticedAt: Date | null;
}

export interface ClassPracticeProgressLearnerRow {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly sessionsCompleted: number;
  readonly questionsAttempted: number;
  readonly firstAttemptAccuracy: number;
  readonly finalAccuracy: number;
  readonly lastPracticedAt: Date | null;
}

export interface ClassPracticeProgressSummary {
  readonly learnersWithPractice: number;
  readonly sessionsCompleted: number;
  readonly questionsAttempted: number;
  readonly firstAttemptCorrect: number;
  readonly finalCorrect: number;
  readonly firstAttemptAccuracy: number;
  readonly finalAccuracy: number;
  readonly lastPracticedAt: Date | null;
}

export interface ClassPracticeProgressSnapshot {
  readonly classId: string;
  readonly filters: PracticeProgressFilters;
  readonly summary: ClassPracticeProgressSummary;
  readonly learners: {
    readonly items: readonly ClassPracticeProgressLearnerRow[];
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface GetEnrollmentPracticeProgressInput {
  readonly enrollmentId: string;
  readonly actorUserId: string;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface GetClassPracticeProgressInput {
  readonly classId: string;
  readonly actorUserId: string;
  readonly page?: number;
  readonly limit?: number;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
  readonly from?: string;
  readonly to?: string;
}
