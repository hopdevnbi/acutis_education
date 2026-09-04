export enum ClassSessionStatus {
  Scheduled = 'SCHEDULED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export const CLASS_SESSION_STATUSES: readonly ClassSessionStatus[] = [
  ClassSessionStatus.Scheduled,
  ClassSessionStatus.Completed,
  ClassSessionStatus.Cancelled,
] as const;
