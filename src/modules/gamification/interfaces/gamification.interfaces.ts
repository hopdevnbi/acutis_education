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
import type { RewardEligibleEvent } from '../../application-events/contracts/reward-eligible-event.contract';

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
  readonly conditionConfigJson: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProcessedRewardEventSnapshot {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly studentId: string;
  readonly sourceId: string;
  readonly parishId: string | null;
  readonly enrollmentId: string | null;
  readonly occurredAt: Date;
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

export interface LatestAchievementSnapshot {
  readonly kind: 'BADGE' | 'MISSION' | 'MILESTONE';
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly achievedAt: Date;
  readonly pointsBonus?: number | null;
}

/** Compact learner-facing summary foundation (#004+ HTTP). */
export interface GamificationSummarySnapshot {
  readonly studentId: string;
  readonly parishId: string | null;
  readonly pointsBalance: number;
  readonly lifetimePositivePoints: number;
  readonly activeBadgeCount: number;
  /** Eligible ACTIVE mission definitions for the learner (incl. zero progress). */
  readonly activeMissionCount: number;
  readonly completedMissionCount: number;
  readonly milestoneAchievementCount: number;
  readonly latestAchievement: LatestAchievementSnapshot | null;
}

export interface FaithJourneyTimelineItemSnapshot {
  readonly type: 'POINTS' | 'BADGE' | 'MISSION' | 'MILESTONE';
  readonly occurredAt: Date;
  readonly code: string;
  readonly title: string;
  readonly descriptionKey?: string | null;
  readonly pointsDelta?: number | null;
  readonly relatedId?: string | null;
}

export interface LearnerBadgeView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly iconMediaAssetId: string | null;
  readonly awardedAt: Date;
  readonly pointsBonus: number | null;
}

export interface LearnerMilestoneView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly achievedAt: Date;
}

export interface LearnerMissionView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly conditionType: string;
  readonly currentCount: number;
  readonly targetCount: number;
  readonly status: MissionProgressStatus;
  readonly pointsBonus: number | null;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly completedAt: Date | null;
}

/** Composed Faith Journey read model (#006). */
export interface FaithJourneySnapshot {
  readonly summary: GamificationSummarySnapshot;
  readonly activeMissions: readonly LearnerMissionView[];
  readonly recentBadges: readonly LearnerBadgeView[];
  readonly milestones: readonly LearnerMilestoneView[];
  readonly recentTimeline: readonly FaithJourneyTimelineItemSnapshot[];
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

export interface PointLedgerListResult {
  readonly items: readonly PointLedgerEntrySnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface RewardIngestResult {
  readonly eventId: string;
  readonly alreadyProcessed: boolean;
  readonly ledgerEntriesCreated: number;
  readonly totalPointsAwarded: number;
  readonly matchedRuleCodes: readonly string[];
  /** Internal — badges awarded in this ingest (not HTTP). */
  readonly badgesAwarded: number;
  /** Internal — milestones achieved in this ingest (not HTTP). */
  readonly milestonesAchieved: number;
  /** Internal — missions progressed in this ingest (not HTTP). */
  readonly missionsProgressed: number;
  /** Internal — missions newly completed in this ingest (not HTTP). */
  readonly missionsCompleted: number;
  /**
   * Publish after transaction commit only.
   * Listener publishes these as separate RewardEligibleEvent (MISSION_COMPLETED).
   */
  readonly pendingMissionCompletedEvents: readonly RewardEligibleEvent[];
}

export interface ManualPointAdjustmentInput {
  readonly studentId: string;
  readonly actorUserId: string;
  readonly delta: number;
  readonly reason: string;
}

export interface StudentGamificationContext {
  readonly studentId: string;
  readonly enrollmentId: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly classId: string;
}
