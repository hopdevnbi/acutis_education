export const BADGE_AWARD_SOURCE_REWARD_EVENT = 'REWARD_EVENT' as const;
export const BADGE_AWARD_SOURCE_MANUAL = 'MANUAL' as const;
export const MILESTONE_ACHIEVEMENT_SOURCE_REWARD_EVENT = 'REWARD_EVENT' as const;

export function buildBadgeBonusReasonCode(badgeCode: string): string {
  return `BADGE_BONUS:${badgeCode}`;
}
