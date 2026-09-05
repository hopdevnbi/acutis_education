import type {
  GamificationSummarySnapshot,
  PointLedgerEntrySnapshot,
  PointLedgerListResult,
  RewardRuleSnapshot,
} from '../interfaces/gamification.interfaces';
import type {
  GamificationSummaryResponseDto,
  ManualPointAdjustmentResponseDto,
  PointLedgerItemLearnerResponseDto,
  PointLedgerItemStaffResponseDto,
  PointLedgerListLearnerResponseDto,
  PointLedgerListStaffResponseDto,
} from '../dto/gamification-response.dto';
import type { RewardRuleListResponseDto, RewardRuleResponseDto } from '../dto/reward-rule.dto';

export function toGamificationSummaryResponseDto(
  snapshot: GamificationSummarySnapshot,
): GamificationSummaryResponseDto {
  return {
    studentId: snapshot.studentId,
    parishId: snapshot.parishId,
    pointsBalance: snapshot.pointsBalance,
    lifetimePositivePoints: snapshot.lifetimePositivePoints,
    activeBadgeCount: snapshot.activeBadgeCount,
    completedMissionCount: snapshot.completedMissionCount,
    milestoneAchievementCount: snapshot.milestoneAchievementCount,
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
