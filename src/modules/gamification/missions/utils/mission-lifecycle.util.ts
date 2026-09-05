import { MissionDefinitionStatus } from '../../enums/gamification.enums';
import { InvalidMissionLifecycleTransitionError } from '../../errors/gamification.errors';

const ALLOWED: Record<MissionDefinitionStatus, readonly MissionDefinitionStatus[]> = {
  [MissionDefinitionStatus.Draft]: [
    MissionDefinitionStatus.Active,
    MissionDefinitionStatus.Archived,
  ],
  [MissionDefinitionStatus.Active]: [MissionDefinitionStatus.Archived],
  [MissionDefinitionStatus.Archived]: [],
};

export function assertMissionLifecycleTransition(
  from: MissionDefinitionStatus,
  to: MissionDefinitionStatus,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED[from].includes(to)) {
    throw new InvalidMissionLifecycleTransitionError(
      `Invalid mission lifecycle transition: ${from} -> ${to}.`,
    );
  }
}

/**
 * ACTIVE missions: only name, description, endsAt (extension) are editable.
 * Scope, conditionType, targetCount, pointsBonus, startsAt, parishId, classId are immutable.
 */
export type MissionActiveEditableField = 'name' | 'description' | 'endsAt';

export const MISSION_ACTIVE_EDITABLE_FIELDS: readonly MissionActiveEditableField[] = [
  'name',
  'description',
  'endsAt',
] as const;
