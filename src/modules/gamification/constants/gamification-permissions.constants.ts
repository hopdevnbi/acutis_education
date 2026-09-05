export const GAMIFICATION_READ_PERMISSION = 'gamification.read' as const;
export const GAMIFICATION_MANAGE_PERMISSION = 'gamification.manage' as const;
export const POINTS_ADJUST_PERMISSION = 'points.adjust' as const;
export const BADGES_AWARD_PERMISSION = 'badges.award' as const;

export const GAMIFICATION_PERMISSIONS = [
  GAMIFICATION_READ_PERMISSION,
  GAMIFICATION_MANAGE_PERMISSION,
  POINTS_ADJUST_PERMISSION,
  BADGES_AWARD_PERMISSION,
] as const;

export const POINT_LEDGER_STAFF_NOTE_MAX_LENGTH = 500 as const;
export const POINT_ADJUSTMENT_MAX_ABS_DELTA = 1000 as const;
export const REWARD_RULE_CODE_MAX_LENGTH = 128 as const;
export const BADGE_CODE_MAX_LENGTH = 64 as const;
export const MISSION_CODE_MAX_LENGTH = 64 as const;
export const MILESTONE_CODE_MAX_LENGTH = 64 as const;
