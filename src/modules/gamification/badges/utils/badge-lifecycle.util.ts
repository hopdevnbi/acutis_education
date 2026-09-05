import { BadgeDefinitionStatus } from '../../enums/gamification.enums';
import { InvalidBadgeRuleConfigError } from '../../errors/gamification.errors';

const ALLOWED_BADGE_LIFECYCLE_TRANSITIONS: Record<
  BadgeDefinitionStatus,
  readonly BadgeDefinitionStatus[]
> = {
  [BadgeDefinitionStatus.Draft]: [BadgeDefinitionStatus.Active, BadgeDefinitionStatus.Archived],
  [BadgeDefinitionStatus.Active]: [BadgeDefinitionStatus.Archived],
  [BadgeDefinitionStatus.Archived]: [],
};

/**
 * Enforces badge definition status transitions:
 * DRAFT -> ACTIVE | ARCHIVED; ACTIVE -> ARCHIVED; ARCHIVED is terminal.
 */
export function assertBadgeLifecycleTransition(
  from: BadgeDefinitionStatus,
  to: BadgeDefinitionStatus,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_BADGE_LIFECYCLE_TRANSITIONS[from].includes(to)) {
    throw new InvalidBadgeRuleConfigError(
      `Invalid badge lifecycle transition: ${from} -> ${to}.`,
    );
  }
}
