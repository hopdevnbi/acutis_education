import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  FaithJourneySnapshot,
  FaithJourneyTimelineItemSnapshot,
  GamificationSummarySnapshot,
  LatestAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionDefinitionSnapshot,
  PointLedgerEntrySnapshot,
  PointLedgerListResult,
  RewardRuleSnapshot,
} from '../interfaces/gamification.interfaces';
import type {
  GamificationSummaryResponseDto,
  LatestAchievementDto,
  ManualPointAdjustmentResponseDto,
  PointLedgerItemLearnerResponseDto,
  PointLedgerItemStaffResponseDto,
  PointLedgerListLearnerResponseDto,
  PointLedgerListStaffResponseDto,
} from '../dto/gamification-response.dto';
import type {
  FaithJourneyResponseDto,
  FaithJourneyTimelineItemDto,
} from '../dto/faith-journey.dto';
import type {
  BadgeAwardActionResponseDto,
  BadgeDefinitionListResponseDto,
  BadgeDefinitionResponseDto,
  LearnerBadgeListResponseDto,
  StaffStudentBadgeListResponseDto,
} from '../dto/badge.dto';
import type {
  LearnerMilestoneListResponseDto,
  MilestoneDefinitionListResponseDto,
  MilestoneDefinitionResponseDto,
  StaffStudentMilestoneListResponseDto,
} from '../dto/milestone.dto';
import type { RewardRuleListResponseDto, RewardRuleResponseDto } from '../dto/reward-rule.dto';
import type {
  LearnerBadgeView,
  LearnerMilestoneView,
  LearnerMissionView,
  StaffMissionProgressListView,
  StaffStudentBadgeView,
  StaffStudentMilestoneView,
} from '../gamification.service';
import type {
  LearnerMissionListResponseDto,
  LearnerMissionResponseDto,
  MissionDefinitionListResponseDto,
  MissionDefinitionResponseDto,
  MissionProgressListResponseDto,
} from '../dto/mission.dto';
import type { MissionDefinitionListResult } from '../missions/services/mission.service';

export function toLatestAchievementDto(
  snapshot: LatestAchievementSnapshot,
): LatestAchievementDto {
  return {
    kind: snapshot.kind,
    code: snapshot.code,
    name: snapshot.name,
    description: snapshot.description,
    achievedAt: snapshot.achievedAt,
    pointsBonus: snapshot.pointsBonus ?? null,
  };
}

export function toGamificationSummaryResponseDto(
  snapshot: GamificationSummarySnapshot,
): GamificationSummaryResponseDto {
  return {
    studentId: snapshot.studentId,
    parishId: snapshot.parishId,
    pointsBalance: snapshot.pointsBalance,
    lifetimePositivePoints: snapshot.lifetimePositivePoints,
    activeBadgeCount: snapshot.activeBadgeCount,
    activeMissionCount: snapshot.activeMissionCount,
    completedMissionCount: snapshot.completedMissionCount,
    milestoneAchievementCount: snapshot.milestoneAchievementCount,
    latestAchievement: snapshot.latestAchievement
      ? toLatestAchievementDto(snapshot.latestAchievement)
      : null,
  };
}

export function toStaffPointLedgerItemDto(
  entry: PointLedgerEntrySnapshot,
): PointLedgerItemStaffResponseDto {
  return {
    id: entry.id,
    pointsDelta: entry.pointsDelta,
    sourceType: entry.sourceType,
    reasonCode: entry.reasonCode,
    descriptionKey: entry.descriptionKey,
    staffNote: entry.staffNote,
    createdAt: entry.createdAt,
  };
}

export function toLearnerPointLedgerItemDto(
  entry: PointLedgerEntrySnapshot,
): PointLedgerItemLearnerResponseDto {
  return {
    id: entry.id,
    pointsDelta: entry.pointsDelta,
    sourceType: entry.sourceType,
    reasonKey: entry.descriptionKey ?? entry.reasonCode,
    descriptionKey: entry.descriptionKey,
    createdAt: entry.createdAt,
  };
}

export function toStaffPointLedgerListDto(
  result: PointLedgerListResult,
): PointLedgerListStaffResponseDto {
  return {
    items: result.items.map(toStaffPointLedgerItemDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toLearnerPointLedgerListDto(
  result: PointLedgerListResult,
): PointLedgerListLearnerResponseDto {
  return {
    items: result.items.map(toLearnerPointLedgerItemDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toManualAdjustmentResponseDto(
  entry: PointLedgerEntrySnapshot,
): ManualPointAdjustmentResponseDto {
  return {
    id: entry.id,
    studentId: entry.studentId,
    pointsDelta: entry.pointsDelta,
    sourceType: entry.sourceType,
    reasonCode: entry.reasonCode,
    staffNote: entry.staffNote,
    createdAt: entry.createdAt,
  };
}

export function toRewardRuleResponseDto(rule: RewardRuleSnapshot): RewardRuleResponseDto {
  return {
    id: rule.id,
    code: rule.code,
    eventType: rule.eventType,
    sourceType: rule.sourceType,
    points: rule.points,
    status: rule.status,
    maxAwardsPerSource: rule.maxAwardsPerSource,
    scopeType: rule.scopeType,
    parishId: rule.parishId,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    conditionConfigJson: rule.conditionConfigJson,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export function toRewardRuleListResponseDto(
  rules: readonly RewardRuleSnapshot[],
): RewardRuleListResponseDto {
  return { items: rules.map(toRewardRuleResponseDto) };
}

export function toBadgeDefinitionResponseDto(
  badge: BadgeDefinitionSnapshot,
): BadgeDefinitionResponseDto {
  return {
    id: badge.id,
    code: badge.code,
    name: badge.name,
    description: badge.description,
    category: badge.category,
    scopeType: badge.scopeType,
    parishId: badge.parishId,
    status: badge.status,
    awardMode: badge.awardMode,
    ruleEventType: badge.ruleEventType,
    ruleConfigJson: badge.ruleConfigJson,
    pointsBonus: badge.pointsBonus,
    iconMediaAssetId: badge.iconMediaAssetId,
    createdAt: badge.createdAt,
    updatedAt: badge.updatedAt,
  };
}

export function toBadgeDefinitionListResponseDto(
  badges: readonly BadgeDefinitionSnapshot[],
): BadgeDefinitionListResponseDto {
  return { items: badges.map(toBadgeDefinitionResponseDto) };
}

export function toBadgeAwardActionResponseDto(
  award: BadgeAwardSnapshot,
): BadgeAwardActionResponseDto {
  return {
    awardId: award.id,
    badgeDefinitionId: award.badgeDefinitionId,
    studentId: award.studentId,
    awardedAt: award.awardedAt,
    revokedAt: award.revokedAt,
    sourceType: award.sourceType,
  };
}

export function toLearnerBadgeListResponseDto(
  items: readonly LearnerBadgeView[],
): LearnerBadgeListResponseDto {
  return {
    items: items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      iconMediaAssetId: item.iconMediaAssetId,
      awardedAt: item.awardedAt,
      pointsBonus: item.pointsBonus,
    })),
  };
}

export function toStaffStudentBadgeListResponseDto(
  items: readonly StaffStudentBadgeView[],
): StaffStudentBadgeListResponseDto {
  return {
    items: items.map((item) => ({
      awardId: item.awardId,
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      iconMediaAssetId: item.iconMediaAssetId,
      pointsBonus: item.pointsBonus,
      awardedAt: item.awardedAt,
      revokedAt: item.revokedAt,
    })),
  };
}

export function toMilestoneDefinitionResponseDto(
  milestone: MilestoneDefinitionSnapshot,
): MilestoneDefinitionResponseDto {
  return {
    id: milestone.id,
    code: milestone.code,
    name: milestone.name,
    description: milestone.description,
    status: milestone.status,
    triggerType: milestone.triggerType,
    triggerConfigJson: milestone.triggerConfigJson,
    sortOrder: milestone.sortOrder,
    createdAt: milestone.createdAt,
    updatedAt: milestone.updatedAt,
  };
}

export function toMilestoneDefinitionListResponseDto(
  milestones: readonly MilestoneDefinitionSnapshot[],
): MilestoneDefinitionListResponseDto {
  return { items: milestones.map(toMilestoneDefinitionResponseDto) };
}

export function toLearnerMilestoneListResponseDto(
  items: readonly LearnerMilestoneView[],
): LearnerMilestoneListResponseDto {
  return {
    items: items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      achievedAt: item.achievedAt,
    })),
  };
}

export function toStaffStudentMilestoneListResponseDto(
  items: readonly StaffStudentMilestoneView[],
): StaffStudentMilestoneListResponseDto {
  return {
    items: items.map((item) => ({
      achievementId: item.achievementId,
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      achievedAt: item.achievedAt,
    })),
  };
}

export function toMissionDefinitionResponseDto(
  mission: MissionDefinitionSnapshot,
): MissionDefinitionResponseDto {
  return {
    id: mission.id,
    code: mission.code,
    name: mission.name,
    description: mission.description,
    status: mission.status,
    scopeType: mission.scopeType,
    parishId: mission.parishId,
    classId: mission.classId,
    scopeKey: mission.scopeKey,
    conditionType: mission.conditionType,
    targetCount: mission.targetCount,
    pointsBonus: mission.pointsBonus,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
  };
}

export function toMissionDefinitionListResponseDto(
  result: MissionDefinitionListResult | {
    readonly items: readonly MissionDefinitionSnapshot[];
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  },
): MissionDefinitionListResponseDto {
  return {
    items: result.items.map(toMissionDefinitionResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toMissionProgressListResponseDto(
  result: StaffMissionProgressListView,
): MissionProgressListResponseDto {
  return {
    items: result.items.map((item) => ({
      studentId: item.studentId,
      displayName: item.displayName,
      currentCount: item.currentCount,
      targetCount: item.targetCount,
      status: item.status,
      completedAt: item.completedAt,
    })),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toLearnerMissionResponseDto(item: LearnerMissionView): LearnerMissionResponseDto {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    conditionType: item.conditionType as LearnerMissionResponseDto['conditionType'],
    currentCount: item.currentCount,
    targetCount: item.targetCount,
    status: item.status,
    pointsBonus: item.pointsBonus,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    completedAt: item.completedAt,
  };
}

export function toLearnerMissionListResponseDto(
  items: readonly LearnerMissionView[],
): LearnerMissionListResponseDto {
  return { items: items.map(toLearnerMissionResponseDto) };
}

export function toFaithJourneyTimelineItemDto(
  snapshot: FaithJourneyTimelineItemSnapshot,
): FaithJourneyTimelineItemDto {
  return {
    type: snapshot.type,
    occurredAt: snapshot.occurredAt,
    code: snapshot.code,
    title: snapshot.title,
    descriptionKey: snapshot.descriptionKey ?? null,
    pointsDelta: snapshot.pointsDelta ?? null,
    relatedId: snapshot.relatedId ?? null,
  };
}

export function toFaithJourneyResponseDto(
  snapshot: FaithJourneySnapshot,
): FaithJourneyResponseDto {
  return {
    summary: toGamificationSummaryResponseDto(snapshot.summary),
    activeMissions: snapshot.activeMissions.map(toLearnerMissionResponseDto),
    recentBadges: snapshot.recentBadges.map((badge) => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      iconMediaAssetId: badge.iconMediaAssetId,
      awardedAt: badge.awardedAt,
      pointsBonus: badge.pointsBonus,
    })),
    milestones: snapshot.milestones.map((milestone) => ({
      id: milestone.id,
      code: milestone.code,
      name: milestone.name,
      description: milestone.description,
      sortOrder: milestone.sortOrder,
      achievedAt: milestone.achievedAt,
    })),
    recentTimeline: snapshot.recentTimeline.map(toFaithJourneyTimelineItemDto),
  };
}
