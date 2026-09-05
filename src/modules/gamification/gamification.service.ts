import { Injectable } from '@nestjs/common';
import { MissionProgressStatus } from './enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  GamificationSummarySnapshot,
  MilestoneAchievementSnapshot,
  MissionProgressSnapshot,
  PointBalanceSummary,
  PointLedgerEntrySnapshot,
  RewardRuleSnapshot,
} from './interfaces/gamification.interfaces';
import { BadgeService } from './badges/services/badge.service';
import { MilestoneService } from './milestones/services/milestone.service';
import { MissionService } from './missions/services/mission.service';
import { PointLedgerService } from './points/services/point-ledger.service';
import { RewardEventReceiptService } from './rewards/services/reward-event-receipt.service';
import { RewardRuleService } from './rewards/services/reward-rule.service';

/**
 * Public facade for GamificationModule.
 * Exposes stable safe reads and foundation helpers only — not raw repositories
 * and not bypass mutation primitives for ingest (#003).
 */
@Injectable()
export class GamificationService {
  constructor(
    private readonly rewardRuleService: RewardRuleService,
    private readonly rewardEventReceiptService: RewardEventReceiptService,
    private readonly pointLedgerService: PointLedgerService,
    private readonly badgeService: BadgeService,
    private readonly missionService: MissionService,
    private readonly milestoneService: MilestoneService,
  ) {}

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
