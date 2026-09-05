import { Injectable } from '@nestjs/common';
import type { RewardEligibleEvent } from '../application-events/contracts/reward-eligible-event.contract';
import { MissionProgressStatus } from './enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  GamificationSummarySnapshot,
  ManualPointAdjustmentInput,
  MilestoneAchievementSnapshot,
  MissionProgressSnapshot,
  PointBalanceSummary,
  PointLedgerEntrySnapshot,
  PointLedgerListResult,
  RewardIngestResult,
  RewardRuleSnapshot,
} from './interfaces/gamification.interfaces';
import { BadgeService } from './badges/services/badge.service';
import { MilestoneService } from './milestones/services/milestone.service';
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

@Injectable()
export class GamificationService {
  constructor(
    private readonly rewardRuleService: RewardRuleService,
    private readonly rewardEventReceiptService: RewardEventReceiptService,
    private readonly rewardIngestService: RewardIngestService,
    private readonly pointLedgerService: PointLedgerService,
    private readonly pointAdjustmentService: PointAdjustmentService,
    private readonly badgeService: BadgeService,
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
