export class ZeroPointsDeltaError extends Error {
  constructor() {
    super('Point ledger points_delta must be non-zero.');
    this.name = 'ZeroPointsDeltaError';
  }
}

export class PointLedgerDuplicateIdentityError extends Error {
  constructor() {
    super('Point ledger entry with the same award identity already exists.');
    this.name = 'PointLedgerDuplicateIdentityError';
  }
}

export class PointLedgerEntryNotFoundError extends Error {
  constructor() {
    super('Point ledger entry not found.');
    this.name = 'PointLedgerEntryNotFoundError';
  }
}

export class RewardRuleNotFoundError extends Error {
  constructor() {
    super('Reward rule not found.');
    this.name = 'RewardRuleNotFoundError';
  }
}

export class RewardRuleCodeAlreadyExistsError extends Error {
  constructor() {
    super('Reward rule code already exists.');
    this.name = 'RewardRuleCodeAlreadyExistsError';
  }
}

export class InvalidRewardRuleScopeError extends Error {
  constructor() {
    super('Invalid reward rule scope configuration.');
    this.name = 'InvalidRewardRuleScopeError';
  }
}

export class RewardEventAlreadyProcessedError extends Error {
  constructor() {
    super('Reward event was already processed.');
    this.name = 'RewardEventAlreadyProcessedError';
  }
}

export class BadgeDefinitionNotFoundError extends Error {
  constructor() {
    super('Badge definition not found.');
    this.name = 'BadgeDefinitionNotFoundError';
  }
}

export class BadgeDefinitionCodeAlreadyExistsError extends Error {
  constructor() {
    super('Badge definition code already exists.');
    this.name = 'BadgeDefinitionCodeAlreadyExistsError';
  }
}

export class InvalidBadgeScopeError extends Error {
  constructor() {
    super('Invalid badge scope configuration.');
    this.name = 'InvalidBadgeScopeError';
  }
}

export class ActiveBadgeAwardAlreadyExistsError extends Error {
  constructor() {
    super('An active badge award already exists for this student and badge.');
    this.name = 'ActiveBadgeAwardAlreadyExistsError';
  }
}

export class BadgeAwardNotFoundError extends Error {
  constructor() {
    super('Badge award not found.');
    this.name = 'BadgeAwardNotFoundError';
  }
}

export class MissionDefinitionNotFoundError extends Error {
  constructor() {
    super('Mission definition not found.');
    this.name = 'MissionDefinitionNotFoundError';
  }
}

export class MissionDefinitionCodeAlreadyExistsError extends Error {
  constructor() {
    super('Mission definition code already exists in this scope.');
    this.name = 'MissionDefinitionCodeAlreadyExistsError';
  }
}

export class InvalidMissionScopeError extends Error {
  constructor() {
    super('Invalid mission scope configuration.');
    this.name = 'InvalidMissionScopeError';
  }
}

export class MissionProgressNotFoundError extends Error {
  constructor() {
    super('Mission progress not found.');
    this.name = 'MissionProgressNotFoundError';
  }
}

export class MilestoneDefinitionNotFoundError extends Error {
  constructor() {
    super('Milestone definition not found.');
    this.name = 'MilestoneDefinitionNotFoundError';
  }
}

export class MilestoneDefinitionCodeAlreadyExistsError extends Error {
  constructor() {
    super('Milestone definition code already exists.');
    this.name = 'MilestoneDefinitionCodeAlreadyExistsError';
  }
}

export class MilestoneAchievementAlreadyExistsError extends Error {
  constructor() {
    super('Milestone achievement already exists for this student.');
    this.name = 'MilestoneAchievementAlreadyExistsError';
  }
}

export class GamificationAccessDeniedError extends Error {
  constructor() {
    super('Gamification access denied.');
    this.name = 'GamificationAccessDeniedError';
  }
}

export class InvalidRewardEventMetadataError extends Error {
  constructor(message = 'Reward event metadata contains disallowed keys.') {
    super(message);
    this.name = 'InvalidRewardEventMetadataError';
  }
}

export class BadgeDefinitionNotActiveError extends Error {
  constructor() {
    super('Badge definition is not ACTIVE.');
    this.name = 'BadgeDefinitionNotActiveError';
  }
}

export class BadgeAwardNotAllowedError extends Error {
  constructor(message = 'Badge award is not allowed for this badge or actor.') {
    super(message);
    this.name = 'BadgeAwardNotAllowedError';
  }
}

export class BadgeAlreadyAwardedError extends Error {
  constructor() {
    super('An active badge award already exists for this student and badge.');
    this.name = 'BadgeAlreadyAwardedError';
  }
}

export class BadgeAlreadyRevokedError extends Error {
  constructor() {
    super('Badge award is already revoked.');
    this.name = 'BadgeAlreadyRevokedError';
  }
}

export class MilestoneDefinitionNotActiveError extends Error {
  constructor() {
    super('Milestone definition is not ACTIVE.');
    this.name = 'MilestoneDefinitionNotActiveError';
  }
}

export class MilestoneDefinitionAccessDeniedError extends Error {
  constructor() {
    super('Milestone definition management is denied.');
    this.name = 'MilestoneDefinitionAccessDeniedError';
  }
}

export class InvalidBadgeRuleConfigError extends Error {
  constructor(message = 'Invalid badge rule configuration.') {
    super(message);
    this.name = 'InvalidBadgeRuleConfigError';
  }
}

export class InvalidMilestoneTriggerConfigError extends Error {
  constructor(message = 'Invalid milestone trigger configuration.') {
    super(message);
    this.name = 'InvalidMilestoneTriggerConfigError';
  }
}

export class StudentGamificationContextNotFoundError extends Error {
  constructor() {
    super('No ACTIVE enrollment context is available for gamification points.');
    this.name = 'StudentGamificationContextNotFoundError';
  }
}

export class InvalidPointAdjustmentError extends Error {
  constructor(message = 'Invalid point adjustment.') {
    super(message);
    this.name = 'InvalidPointAdjustmentError';
  }
}

export class RewardRuleConfigurationError extends Error {
  constructor(message = 'Invalid reward rule configuration.') {
    super(message);
    this.name = 'RewardRuleConfigurationError';
  }
}

export class PointLedgerEntryAlreadyReversedError extends Error {
  constructor() {
    super('Point ledger entry has already been reversed.');
    this.name = 'PointLedgerEntryAlreadyReversedError';
  }
}

/** Prompt-facing aliases for badge/milestone HTTP/error contracts. */
export class BadgeNotFoundError extends BadgeDefinitionNotFoundError {
  constructor() {
    super();
    this.name = 'BadgeNotFoundError';
    this.message = 'Badge definition not found.';
  }
}

export class MilestoneNotFoundError extends MilestoneDefinitionNotFoundError {
  constructor() {
    super();
    this.name = 'MilestoneNotFoundError';
    this.message = 'Milestone definition not found.';
  }
}

export class MilestoneAlreadyAchievedError extends MilestoneAchievementAlreadyExistsError {
  constructor() {
    super();
    this.name = 'MilestoneAlreadyAchievedError';
  }
}
