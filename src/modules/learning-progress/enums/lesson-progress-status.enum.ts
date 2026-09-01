export enum LessonProgressStatus {
  NotStarted = 'NOT_STARTED',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

export enum LessonProgressPersistedStatus {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

export type LessonProgressTargetStatus =
  LessonProgressStatus.InProgress | LessonProgressStatus.Completed;
