export enum PointSourceType {
  LessonCompleted = 'LESSON_COMPLETED',
  PracticeCompleted = 'PRACTICE_COMPLETED',
  ExamCompleted = 'EXAM_COMPLETED',
  ExamScoreThreshold = 'EXAM_SCORE_THRESHOLD',
  AttendancePresent = 'ATTENDANCE_PRESENT',
  AttendanceLate = 'ATTENDANCE_LATE',
  MissionCompleted = 'MISSION_COMPLETED',
  BadgeBonus = 'BADGE_BONUS',
  ManualAward = 'MANUAL_AWARD',
  Adjustment = 'ADJUSTMENT',
  Reversal = 'REVERSAL',
}

export const POINT_SOURCE_TYPES: readonly PointSourceType[] = Object.values(PointSourceType);

export enum RewardRuleStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export enum RewardScopeType {
  Global = 'GLOBAL',
  Parish = 'PARISH',
}

export enum BadgeDefinitionStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
}

export enum BadgeAwardMode {
  Automatic = 'AUTOMATIC',
  Manual = 'MANUAL',
  Both = 'BOTH',
}

export enum BadgeScopeType {
  Global = 'GLOBAL',
  Parish = 'PARISH',
}

export enum MissionDefinitionStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
}

export enum MissionScopeType {
  Global = 'GLOBAL',
  Parish = 'PARISH',
  Class = 'CLASS',
}

export enum MissionConditionType {
  LessonsCompleted = 'LESSONS_COMPLETED',
  PracticeCompleted = 'PRACTICE_COMPLETED',
  AttendancePresentOrLate = 'ATTENDANCE_PRESENT_OR_LATE',
  ExamsCompleted = 'EXAMS_COMPLETED',
}

export enum MissionProgressStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
}

export enum MilestoneDefinitionStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
}

export enum MilestoneTriggerType {
  FirstLessonCompleted = 'FIRST_LESSON_COMPLETED',
  LessonsCompletedCount = 'LESSONS_COMPLETED_COUNT',
  AttendanceCount = 'ATTENDANCE_COUNT',
  FirstExamCompleted = 'FIRST_EXAM_COMPLETED',
  FirstMissionCompleted = 'FIRST_MISSION_COMPLETED',
}

export const MILESTONE_TRIGGER_TYPES: readonly MilestoneTriggerType[] =
  Object.values(MilestoneTriggerType);
