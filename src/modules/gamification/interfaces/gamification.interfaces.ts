import type {
  BadgeAwardMode,
  BadgeDefinitionStatus,
  BadgeScopeType,
  MilestoneDefinitionStatus,
  MilestoneTriggerType,
  MissionConditionType,
  MissionDefinitionStatus,
  MissionProgressStatus,
  MissionScopeType,
  PointSourceType,
  RewardRuleStatus,
  RewardScopeType,
} from '../enums/gamification.enums';

export interface RewardRuleSnapshot {
  readonly id: string;
  readonly code: string;
  readonly eventType: string;
  readonly sourceType: string;
  readonly points: number;
  readonly status: RewardRuleStatus;
  readonly maxAwardsPerSource: number;
  readonly scopeType: RewardScopeType;
  readonly parishId: string | null;
  readonly effectiveFrom: Date | null;
  readonly effectiveTo: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProcessedRewardEventSnapshot {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly studentId: string;
  readonly sourceId: string;
  readonly processedAt: Date;
  readonly createdAt: Date;
}

export interface PointLedgerEntrySnapshot {
  readonly id: string;
  readonly studentId: string;
  readonly enrollmentId: string | null;
  readonly parishId: string;
  readonly academicYearId: string | null;
  readonly pointsDelta: number;
  readonly sourceType: PointSourceType | string;
  readonly sourceId: string;
  readonly reasonCode: string;
  readonly descriptionKey: string | null;
  /** Staff-only; omit from learner/parent responses by default. */
  readonly staffNote: string | null;
  readonly awardedByUserId: string | null;
  readonly relatedLedgerEntryId: string | null;
  readonly createdAt: Date;
}

export interface PointBalanceSummary {
  readonly studentId: string;
  readonly parishId?: string | null;
  readonly academicYearId?: string | null;
  readonly balance: number;
  readonly lifetimePositivePoints: number;
  readonly entryCount: number;
}

export interface BadgeDefinitionSnapshot {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly scopeType: BadgeScopeType;
  readonly parishId: string | null;
  readonly status: BadgeDefinitionStatus;
  readonly awardMode: BadgeAwardMode;
  readonly ruleEventType: string | null;
  readonly ruleConfigJson: string | null;
  readonly pointsBonus: number | null;
  readonly iconMediaAssetId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BadgeAwardSnapshot {
  readonly id: string;
  readonly badgeDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId: string | null;
  readonly parishId: string;
  readonly awardedAt: Date;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly awardedByUserId: string | null;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}

export interface MissionDefinitionSnapshot {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: MissionDefinitionStatus;
  readonly scopeType: MissionScopeType;
  readonly parishId: string | null;
  readonly classId: string | null;
  readonly scopeKey: string;
  readonly conditionType: MissionConditionType;
  readonly targetCount: number;
  readonly pointsBonus: number | null;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MissionProgressSnapshot {
  readonly id: string;
  readonly missionDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId: string | null;
  readonly currentCount: number;
  readonly targetCount: number;
  readonly status: MissionProgressStatus;
  readonly completedAt: Date | null;
  readonly lastEventId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MilestoneDefinitionSnapshot {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: MilestoneDefinitionStatus;
  readonly triggerType: MilestoneTriggerType;
  readonly triggerConfigJson: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MilestoneAchievementSnapshot {
  readonly id: string;
  readonly milestoneDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId: string | null;
  readonly parishId: string;
  readonly achievedAt: Date;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly createdAt: Date;
}

/** Compact learner-facing summary foundation (#004+ HTTP). */
export interface GamificationSummarySnapshot {
  readonly studentId: string;
  readonly parishId: string | null;
  readonly pointsBalance: number;
  readonly lifetimePositivePoints: number;
  readonly activeBadgeCount: number;
  readonly completedMissionCount: number;
  readonly milestoneAchievementCount: number;
}

/** Placeholder composed Faith Journey read model (#005+). */
export interface FaithJourneySnapshot {
  readonly studentId: string;
  readonly enrollmentId: string | null;
  readonly generatedAt: Date;
  readonly items: readonly FaithJourneyItemPlaceholder[];
}

export interface FaithJourneyItemPlaceholder {
  readonly kind: 'POINT' | 'BADGE' | 'MISSION' | 'MILESTONE';
  readonly occurredAt: Date;
  readonly refId: string;
  readonly titleKey: string | null;
}

export interface PointLedgerIdentity {
  readonly studentId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly reasonCode: string;
}

export interface AppendPointLedgerEntryInput {
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly parishId: string;
  readonly academicYearId?: string | null;
  readonly pointsDelta: number;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly reasonCode: string;
  readonly descriptionKey?: string | null;
  readonly staffNote?: string | null;
  readonly awardedByUserId?: string | null;
  readonly relatedLedgerEntryId?: string | null;
}
