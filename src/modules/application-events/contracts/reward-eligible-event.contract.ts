/**
 * Stable reward-eligible event type constants.
 * Source modules emit these; Gamification ingests them (#003+).
 */
export const REWARD_EVENT_TYPES = {
  LearningLessonCompleted: 'LEARNING_LESSON_COMPLETED',
  PracticeCompleted: 'PRACTICE_COMPLETED',
  ExamCompleted: 'EXAM_COMPLETED',
  AttendanceSessionCompletedMark: 'ATTENDANCE_SESSION_COMPLETED_MARK',
  MissionCompleted: 'MISSION_COMPLETED',
} as const;

export type RewardEventType = (typeof REWARD_EVENT_TYPES)[keyof typeof REWARD_EVENT_TYPES];

export const REWARD_EVENT_TYPE_VALUES: readonly RewardEventType[] = Object.values(REWARD_EVENT_TYPES);

/** Allow-listed metadata keys only — no PII (names, emails, notes). */
export const REWARD_EVENT_METADATA_ALLOWED_KEYS = [
  'attendanceStatus',
  'scorePercent',
  'canonicalLessonKey',
  'missionCode',
  'missionScopeType',
] as const;

export type RewardEventMetadataKey = (typeof REWARD_EVENT_METADATA_ALLOWED_KEYS)[number];

export type RewardEventMetadata = Partial<
  Record<RewardEventMetadataKey, string | number | boolean | null>
>;

/**
 * Extraction-safe reward event contract.
 * Placed under application-events so producers need not import GamificationModule.
 */
export interface RewardEligibleEvent {
  readonly eventId: string;
  readonly eventType: RewardEventType | string;
  readonly occurredAt: Date;
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly classId?: string | null;
  readonly parishId: string;
  readonly academicYearId?: string | null;
  readonly sourceId: string;
  readonly metadata?: RewardEventMetadata;
}
