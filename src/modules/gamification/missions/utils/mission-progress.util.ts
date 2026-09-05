import { MissionProgressStatus } from '../enums/gamification.enums';

export function assertTargetCount(targetCount: number): void {
  if (!Number.isInteger(targetCount) || targetCount <= 0) {
    throw new Error('targetCount must be an integer greater than 0.');
  }
}

/** Caps stored progress at target; never stores over-target values. */
export function capMissionCurrentCount(currentCount: number, targetCount: number): number {
  assertTargetCount(targetCount);
  if (!Number.isInteger(currentCount) || currentCount < 0) {
    throw new Error('currentCount must be a non-negative integer.');
  }
  return Math.min(currentCount, targetCount);
}

export function resolveMissionProgressStatus(
  currentCount: number,
  targetCount: number,
): MissionProgressStatus {
  const capped = capMissionCurrentCount(currentCount, targetCount);
  return capped >= targetCount ? MissionProgressStatus.Completed : MissionProgressStatus.Active;
}

export function assertMissionCompletedAtSemantics(input: {
  readonly status: MissionProgressStatus;
  readonly completedAt: Date | null;
}): void {
  if (input.status === MissionProgressStatus.Completed && !input.completedAt) {
    throw new Error('COMPLETED mission progress requires completedAt.');
  }
  if (input.status === MissionProgressStatus.Active && input.completedAt) {
    throw new Error('ACTIVE mission progress must not have completedAt.');
  }
}
