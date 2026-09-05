import type { BadgeAwardEntity } from '../badges/entities/badge-award.entity';
import type { BadgeDefinitionEntity } from '../badges/entities/badge-definition.entity';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionDefinitionSnapshot,
  MissionProgressSnapshot,
  PointLedgerEntrySnapshot,
  ProcessedRewardEventSnapshot,
  RewardRuleSnapshot,
} from '../interfaces/gamification.interfaces';
import type { MilestoneAchievementEntity } from '../milestones/entities/milestone-achievement.entity';
import type { MilestoneDefinitionEntity } from '../milestones/entities/milestone-definition.entity';
import type { MissionDefinitionEntity } from '../missions/entities/mission-definition.entity';
import type { MissionProgressEntity } from '../missions/entities/mission-progress.entity';
import type { PointLedgerEntryEntity } from '../points/entities/point-ledger-entry.entity';
import type { ProcessedRewardEventEntity } from '../rewards/entities/processed-reward-event.entity';
import type { RewardRuleEntity } from '../rewards/entities/reward-rule.entity';

export function toRewardRuleSnapshot(entity: RewardRuleEntity): RewardRuleSnapshot {
  return {
    id: entity.id,
    code: entity.code,
    eventType: entity.eventType,
    sourceType: entity.sourceType,
    points: entity.points,
    status: entity.status,
    maxAwardsPerSource: entity.maxAwardsPerSource,
    scopeType: entity.scopeType,
    parishId: entity.parishId,
    effectiveFrom: entity.effectiveFrom,
    effectiveTo: entity.effectiveTo,
    conditionConfigJson: entity.conditionConfigJson,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toProcessedRewardEventSnapshot(
  entity: ProcessedRewardEventEntity,
): ProcessedRewardEventSnapshot {
  return {
    id: entity.id,
    eventId: entity.eventId,
    eventType: entity.eventType,
    studentId: entity.studentId,
    sourceId: entity.sourceId,
    parishId: entity.parishId ?? null,
    enrollmentId: entity.enrollmentId ?? null,
    occurredAt: entity.occurredAt ?? entity.processedAt,
    processedAt: entity.processedAt,
    createdAt: entity.createdAt,
  };
}

export function toPointLedgerEntrySnapshot(
  entity: PointLedgerEntryEntity,
  options: { readonly includeStaffNote?: boolean } = {},
): PointLedgerEntrySnapshot {
  return {
    id: entity.id,
    studentId: entity.studentId,
    enrollmentId: entity.enrollmentId,
    parishId: entity.parishId,
    academicYearId: entity.academicYearId,
    pointsDelta: entity.pointsDelta,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    reasonCode: entity.reasonCode,
    descriptionKey: entity.descriptionKey,
    staffNote: options.includeStaffNote === true ? entity.staffNote : null,
    awardedByUserId: entity.awardedByUserId,
    relatedLedgerEntryId: entity.relatedLedgerEntryId,
    createdAt: entity.createdAt,
  };
}

export function toBadgeDefinitionSnapshot(entity: BadgeDefinitionEntity): BadgeDefinitionSnapshot {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    category: entity.category,
    scopeType: entity.scopeType,
    parishId: entity.parishId,
    status: entity.status,
    awardMode: entity.awardMode,
    ruleEventType: entity.ruleEventType,
    ruleConfigJson: entity.ruleConfigJson,
    pointsBonus: entity.pointsBonus,
    iconMediaAssetId: entity.iconMediaAssetId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toBadgeAwardSnapshot(entity: BadgeAwardEntity): BadgeAwardSnapshot {
  return {
    id: entity.id,
    badgeDefinitionId: entity.badgeDefinitionId,
    studentId: entity.studentId,
    enrollmentId: entity.enrollmentId,
    parishId: entity.parishId,
    awardedAt: entity.awardedAt,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    awardedByUserId: entity.awardedByUserId,
    revokedAt: entity.revokedAt,
    createdAt: entity.createdAt,
  };
}

export function toMissionDefinitionSnapshot(
  entity: MissionDefinitionEntity,
): MissionDefinitionSnapshot {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    scopeType: entity.scopeType,
    parishId: entity.parishId,
    classId: entity.classId,
    scopeKey: entity.scopeKey,
    conditionType: entity.conditionType,
    targetCount: entity.targetCount,
    pointsBonus: entity.pointsBonus,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toMissionProgressSnapshot(entity: MissionProgressEntity): MissionProgressSnapshot {
  return {
    id: entity.id,
    missionDefinitionId: entity.missionDefinitionId,
    studentId: entity.studentId,
    enrollmentId: entity.enrollmentId,
    currentCount: entity.currentCount,
    targetCount: entity.targetCount,
    status: entity.status,
    completedAt: entity.completedAt,
    lastEventId: entity.lastEventId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toMilestoneDefinitionSnapshot(
  entity: MilestoneDefinitionEntity,
): MilestoneDefinitionSnapshot {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    triggerType: entity.triggerType,
    triggerConfigJson: entity.triggerConfigJson,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toMilestoneAchievementSnapshot(
  entity: MilestoneAchievementEntity,
): MilestoneAchievementSnapshot {
  return {
    id: entity.id,
    milestoneDefinitionId: entity.milestoneDefinitionId,
    studentId: entity.studentId,
    enrollmentId: entity.enrollmentId,
    parishId: entity.parishId,
    achievedAt: entity.achievedAt,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    createdAt: entity.createdAt,
  };
}
