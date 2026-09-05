import { Injectable } from '@nestjs/common';
import type { RewardEligibleEvent } from '../application-events/contracts/reward-eligible-event.contract';
import { MissionProgressStatus } from './enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  GamificationSummarySnapshot,
  ManualPointAdjustmentInput,
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionProgressSnapshot,
  PointBalanceSummary,
  PointLedgerEntrySnapshot,
  PointLedgerListResult,
  RewardIngestResult,
  RewardRuleSnapshot,
} from './interfaces/gamification.interfaces';
import { BadgeManualAwardService } from './badges/services/badge-manual-award.service';
import {
  BadgeService,
  type CreateBadgeDefinitionInput,
  type UpdateBadgeDefinitionInput,
} from './badges/services/badge.service';
import {
  MilestoneService,
  type CreateMilestoneDefinitionInput,
  type UpdateMilestoneDefinitionInput,
} from './milestones/services/milestone.service';
import { MissionService } from './missions/services/mission.service';
import { PointAdjustmentService } from './points/services/point-adjustment.service';
import { PointLedgerService } from './points/services/point-ledger.service';
import { RewardIngestService } from './rewards/services/reward-ingest.service';
import { RewardEventReceiptService } from './rewards/services/reward-event-receipt.service';
import {
  type CreateRewardRuleInput,
  RewardRuleService,
  type UpdateRewardRuleInput,
} from './rewards/services/reward-rule.service';

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

export interface StaffStudentBadgeView extends LearnerBadgeView {
  readonly awardId: string;
  readonly revokedAt: Date | null;
}

export interface LearnerMilestoneView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly achievedAt: Date;
}

export interface StaffStudentMilestoneView extends LearnerMilestoneView {
  readonly achievementId: string;
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly rewardRuleService: RewardRuleService,
    private readonly rewardEventReceiptService: RewardEventReceiptService,
    private readonly rewardIngestService: RewardIngestService,
    private readonly pointLedgerService: PointLedgerService,
    private readonly pointAdjustmentService: PointAdjustmentService,
    private readonly badgeService: BadgeService,
    private readonly badgeManualAwardService: BadgeManualAwardService,
    private readonly missionService: MissionService,
    private readonly milestoneService: MilestoneService,
  ) {}

  async ingestRewardEvent(event: RewardEligibleEvent): Promise<RewardIngestResult> {
    return this.rewardIngestService.ingest(event);
  }

  async getPointBalance(input: {
    readonly studentId: string;
    readonly parishId?: string | null;
    readonly academicYearId?: string | null;
  }): Promise<PointBalanceSummary> {
    return this.pointLedgerService.getBalance(input);
  }

  async listPointLedgerForStudent(
    studentId: string,
    options?: { readonly take?: number },
  ): Promise<PointLedgerEntrySnapshot[]> {
    return this.pointLedgerService.listByStudentId(studentId, {
      take: options?.take,
      includeStaffNote: false,
    });
  }

  async listPointLedgerPaginated(input: {
    readonly studentId: string;
    readonly page: number;
    readonly limit: number;
    readonly includeStaffNote: boolean;
  }): Promise<PointLedgerListResult> {
    return this.pointLedgerService.listByStudentIdPaginated(input);
  }

  async adjustStudentPoints(
    input: ManualPointAdjustmentInput,
  ): Promise<PointLedgerEntrySnapshot> {
    return this.pointAdjustmentService.adjustPoints(input);
  }

  async reversePointLedgerEntry(input: {
    readonly originalEntryId: string;
    readonly actorUserId: string;
    readonly reason: string;
  }): Promise<PointLedgerEntrySnapshot> {
    return this.pointAdjustmentService.reverseLedgerEntry(input);
  }

  async listActiveBadgesForStudent(studentId: string): Promise<BadgeAwardSnapshot[]> {
    return this.badgeService.listAwardsForStudent(studentId, { activeOnly: true });
  }

  async listMissionProgressForStudent(studentId: string): Promise<MissionProgressSnapshot[]> {
    return this.missionService.listProgressForStudent(studentId);
  }

  async listMilestoneAchievementsForStudent(
    studentId: string,
  ): Promise<MilestoneAchievementSnapshot[]> {
    return this.milestoneService.listAchievementsForStudent(studentId);
  }

  async findActiveMatchingRewardRules(input: {
    readonly eventType: string;
    readonly parishId: string;
    readonly at?: Date;
  }): Promise<RewardRuleSnapshot[]> {
    return this.rewardRuleService.findActiveMatchingRules(input);
  }

  async isRewardEventAlreadyProcessed(eventId: string): Promise<boolean> {
    return this.rewardEventReceiptService.isDuplicateEventId(eventId);
  }

  async listRewardRules(input?: {
    readonly parishId?: string | null;
    readonly includeGlobal?: boolean;
  }): Promise<RewardRuleSnapshot[]> {
    return this.rewardRuleService.list(input);
  }

  async getRewardRuleById(id: string): Promise<RewardRuleSnapshot> {
    return this.rewardRuleService.getById(id);
  }

  async createRewardRule(input: CreateRewardRuleInput): Promise<RewardRuleSnapshot> {
    return this.rewardRuleService.create(input);
  }

  async updateRewardRule(id: string, input: UpdateRewardRuleInput): Promise<RewardRuleSnapshot> {
    return this.rewardRuleService.update(id, input);
  }

  async listBadgeDefinitions(input?: {
    readonly parishId?: string | null;
    readonly includeGlobal?: boolean;
  }): Promise<BadgeDefinitionSnapshot[]> {
    return this.badgeService.listDefinitions(input);
  }

  async getBadgeDefinitionById(id: string): Promise<BadgeDefinitionSnapshot> {
    return this.badgeService.getDefinitionById(id);
  }

  async createBadgeDefinition(
    input: CreateBadgeDefinitionInput,
  ): Promise<BadgeDefinitionSnapshot> {
    return this.badgeService.createDefinition(input);
  }

  async updateBadgeDefinition(
    id: string,
    input: UpdateBadgeDefinitionInput,
  ): Promise<BadgeDefinitionSnapshot> {
    return this.badgeService.updateDefinition(id, input);
  }

  async awardBadgeManually(input: {
    readonly actorUserId: string;
    readonly studentId: string;
    readonly badgeId: string;
  }): Promise<{
    award: BadgeAwardSnapshot;
    definition: BadgeDefinitionSnapshot;
    alreadyExisted: boolean;
  }> {
    return this.badgeManualAwardService.awardManually(input);
  }

  async revokeBadgeManually(input: {
    readonly actorUserId: string;
    readonly studentId: string;
    readonly badgeId: string;
  }): Promise<{ award: BadgeAwardSnapshot; definition: BadgeDefinitionSnapshot }> {
    return this.badgeManualAwardService.revokeManually(input);
  }

  async listMilestoneDefinitions(): Promise<MilestoneDefinitionSnapshot[]> {
    return this.milestoneService.listDefinitions();
  }

  async getMilestoneDefinitionById(id: string): Promise<MilestoneDefinitionSnapshot> {
    return this.milestoneService.getDefinitionById(id);
  }

  async createMilestoneDefinition(
    input: CreateMilestoneDefinitionInput,
  ): Promise<MilestoneDefinitionSnapshot> {
    return this.milestoneService.createDefinition(input);
  }

  async updateMilestoneDefinition(
    id: string,
    input: UpdateMilestoneDefinitionInput,
  ): Promise<MilestoneDefinitionSnapshot> {
    return this.milestoneService.updateDefinition(id, input);
  }

  async listLearnerBadges(studentId: string): Promise<LearnerBadgeView[]> {
    const awards = await this.badgeService.listAwardsForStudent(studentId, { activeOnly: true });
    const views: LearnerBadgeView[] = [];
    for (const award of awards) {
      const definition = await this.badgeService.getDefinitionById(award.badgeDefinitionId);
      views.push({
        id: definition.id,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        iconMediaAssetId: definition.iconMediaAssetId,
        awardedAt: award.awardedAt,
        pointsBonus: definition.pointsBonus,
      });
    }
    return views;
  }

  async listStaffStudentBadges(studentId: string): Promise<StaffStudentBadgeView[]> {
    const awards = await this.badgeService.listAwardsForStudent(studentId, { activeOnly: false });
    const views: StaffStudentBadgeView[] = [];
    for (const award of awards) {
      const definition = await this.badgeService.getDefinitionById(award.badgeDefinitionId);
      views.push({
        awardId: award.id,
        id: definition.id,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        iconMediaAssetId: definition.iconMediaAssetId,
        awardedAt: award.awardedAt,
        pointsBonus: definition.pointsBonus,
        revokedAt: award.revokedAt,
      });
    }
    return views;
  }

  async listLearnerMilestones(studentId: string): Promise<LearnerMilestoneView[]> {
    const achievements = await this.milestoneService.listAchievementsForStudent(studentId);
    const views: LearnerMilestoneView[] = [];
    for (const achievement of achievements) {
      const definition = await this.milestoneService.getDefinitionById(
        achievement.milestoneDefinitionId,
      );
      views.push({
        id: definition.id,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder,
        achievedAt: achievement.achievedAt,
      });
    }
    return views;
  }

  async listStaffStudentMilestones(studentId: string): Promise<StaffStudentMilestoneView[]> {
    const achievements = await this.milestoneService.listAchievementsForStudent(studentId);
    const views: StaffStudentMilestoneView[] = [];
    for (const achievement of achievements) {
      const definition = await this.milestoneService.getDefinitionById(
        achievement.milestoneDefinitionId,
      );
      views.push({
        achievementId: achievement.id,
        id: definition.id,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder,
        achievedAt: achievement.achievedAt,
      });
    }
    return views;
  }

  async getGamificationSummary(input: {
    readonly studentId: string;
    readonly parishId?: string | null;
  }): Promise<GamificationSummarySnapshot> {
    const [balance, badges, missions, milestones] = await Promise.all([
      this.pointLedgerService.getBalance({
        studentId: input.studentId,
        parishId: input.parishId,
      }),
      this.badgeService.listAwardsForStudent(input.studentId, { activeOnly: true }),
      this.missionService.listProgressForStudent(input.studentId),
      this.milestoneService.listAchievementsForStudent(input.studentId),
    ]);

    return {
      studentId: balance.studentId,
      parishId: input.parishId ?? null,
      pointsBalance: balance.balance,
      lifetimePositivePoints: balance.lifetimePositivePoints,
      activeBadgeCount: badges.length,
      completedMissionCount: missions.filter((m) => m.status === MissionProgressStatus.Completed)
        .length,
      milestoneAchievementCount: milestones.length,
    };
  }
}
