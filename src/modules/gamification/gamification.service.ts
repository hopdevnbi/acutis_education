import { Injectable } from '@nestjs/common';
import type { RewardEligibleEvent } from '../application-events/contracts/reward-eligible-event.contract';
import { ClassService } from '../class/services/class.service';
import { EnrollmentQueryService } from '../enrollment/services/enrollment-query.service';
import { StudentService } from '../student/services/student.service';
import {
  MissionDefinitionStatus,
  MissionProgressStatus,
} from './enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  FaithJourneySnapshot,
  GamificationSummarySnapshot,
  LatestAchievementSnapshot,
  ManualPointAdjustmentInput,
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionDefinitionSnapshot,
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
import {
  MissionService,
  type CreateMissionDefinitionInput,
  type ListMissionDefinitionsQuery,
  type MissionDefinitionListResult,
  type UpdateMissionDefinitionInput,
} from './missions/services/mission.service';
import {
  FaithJourneyService,
  type BuildFaithJourneyInput,
} from './faith-journey/services/faith-journey.service';
import { PointAdjustmentService } from './points/services/point-adjustment.service';
import { PointLedgerService } from './points/services/point-ledger.service';
import { RewardIngestService } from './rewards/services/reward-ingest.service';
import { RewardEventReceiptService } from './rewards/services/reward-event-receipt.service';
import {
  type CreateRewardRuleInput,
  RewardRuleService,
  type UpdateRewardRuleInput,
} from './rewards/services/reward-rule.service';
import { MissionNotApplicableError } from './errors/gamification.errors';

export type {
  LearnerBadgeView,
  LearnerMilestoneView,
  LearnerMissionView,
} from './interfaces/gamification.interfaces';

export interface StaffStudentBadgeView extends LearnerBadgeView {
  readonly awardId: string;
  readonly revokedAt: Date | null;
}

export interface StaffStudentMilestoneView extends LearnerMilestoneView {
  readonly achievementId: string;
}

export interface StaffMissionProgressItemView {
  readonly studentId: string;
  readonly displayName: string | null;
  readonly currentCount: number;
  readonly targetCount: number;
  readonly status: MissionProgressStatus;
  readonly completedAt: Date | null;
}

export interface StaffMissionProgressListView {
  readonly items: readonly StaffMissionProgressItemView[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
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
    private readonly faithJourneyService: FaithJourneyService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
  ) {}

  async getFaithJourney(input: BuildFaithJourneyInput): Promise<FaithJourneySnapshot> {
    return this.faithJourneyService.buildFaithJourney(input);
  }

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
    if (awards.length === 0) {
      return [];
    }
    const definitionIds = awards.map((award) => award.badgeDefinitionId);
    const definitionMap = await this.badgeService.findDefinitionsByIds(definitionIds);
    const views: LearnerBadgeView[] = [];
    for (const award of awards) {
      const definition = definitionMap.get(award.badgeDefinitionId);
      if (!definition) {
        continue;
      }
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
    if (awards.length === 0) {
      return [];
    }
    const definitionIds = awards.map((award) => award.badgeDefinitionId);
    const definitionMap = await this.badgeService.findDefinitionsByIds(definitionIds);
    const views: StaffStudentBadgeView[] = [];
    for (const award of awards) {
      const definition = definitionMap.get(award.badgeDefinitionId);
      if (!definition) {
        continue;
      }
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
    if (achievements.length === 0) {
      return [];
    }
    const definitionIds = achievements.map((achievement) => achievement.milestoneDefinitionId);
    const definitionMap = await this.milestoneService.findDefinitionsByIds(definitionIds);
    const views: LearnerMilestoneView[] = [];
    for (const achievement of achievements) {
      const definition = definitionMap.get(achievement.milestoneDefinitionId);
      if (!definition) {
        continue;
      }
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
    if (achievements.length === 0) {
      return [];
    }
    const definitionIds = achievements.map((achievement) => achievement.milestoneDefinitionId);
    const definitionMap = await this.milestoneService.findDefinitionsByIds(definitionIds);
    const views: StaffStudentMilestoneView[] = [];
    for (const achievement of achievements) {
      const definition = definitionMap.get(achievement.milestoneDefinitionId);
      if (!definition) {
        continue;
      }
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
    const enrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([input.studentId]);
    const parishId = input.parishId ?? enrollments[0]?.parishId ?? null;
    const classIds = enrollments.map((e) => e.classId);

    const [
      balance,
      badges,
      eligibleMissions,
      completedMissionCount,
      latestCompletedMission,
      milestones,
    ] = await Promise.all([
      this.pointLedgerService.getBalance({
        studentId: input.studentId,
        parishId: input.parishId,
      }),
      this.badgeService.listAwardsForStudent(input.studentId, { activeOnly: true }),
      parishId
        ? this.missionService.listEligibleActiveDefinitionsForLearner({
            parishId,
            classIds,
          })
        : Promise.resolve([] as MissionDefinitionSnapshot[]),
      this.missionService.countCompletedProgressForStudent(input.studentId),
      this.missionService.findLatestCompletedProgressForStudent(input.studentId),
      this.milestoneService.listAchievementsForStudent(input.studentId),
    ]);

    const latestAchievement = await this.resolveLatestAchievement({
      latestBadgeAward: badges[0] ?? null,
      latestCompletedMission: latestCompletedMission ?? null,
      latestMilestoneAchievement: milestones[0] ?? null,
    });

    return {
      studentId: balance.studentId,
      parishId,
      pointsBalance: balance.balance,
      lifetimePositivePoints: balance.lifetimePositivePoints,
      activeBadgeCount: badges.length,
      activeMissionCount: eligibleMissions.length,
      completedMissionCount,
      milestoneAchievementCount: milestones.length,
      latestAchievement,
    };
  }

  private async resolveLatestAchievement(input: {
    readonly latestBadgeAward: BadgeAwardSnapshot | null;
    readonly latestCompletedMission: MissionProgressSnapshot | null;
    readonly latestMilestoneAchievement: MilestoneAchievementSnapshot | null;
  }): Promise<LatestAchievementSnapshot | null> {
    const candidates: Array<{
      readonly kind: 'MILESTONE' | 'BADGE' | 'MISSION';
      readonly occurredAt: Date;
      readonly code: string;
      readonly name: string;
      readonly description: string | null;
      readonly pointsBonus?: number | null;
      readonly tiePriority: number;
    }> = [];

    if (input.latestMilestoneAchievement) {
      const def = await this.milestoneService.getDefinitionById(
        input.latestMilestoneAchievement.milestoneDefinitionId,
      );
      candidates.push({
        kind: 'MILESTONE',
        occurredAt: input.latestMilestoneAchievement.achievedAt,
        code: def.code,
        name: def.name,
        description: def.description,
        pointsBonus: null,
        tiePriority: 3,
      });
    }

    if (input.latestBadgeAward) {
      const def = await this.badgeService.getDefinitionById(
        input.latestBadgeAward.badgeDefinitionId,
      );
      candidates.push({
        kind: 'BADGE',
        occurredAt: input.latestBadgeAward.awardedAt,
        code: def.code,
        name: def.name,
        description: def.description,
        pointsBonus: def.pointsBonus,
        tiePriority: 2,
      });
    }

    if (input.latestCompletedMission) {
      const def = await this.missionService.getDefinitionById(
        input.latestCompletedMission.missionDefinitionId,
      );
      candidates.push({
        kind: 'MISSION',
        occurredAt:
          input.latestCompletedMission.completedAt ??
          input.latestCompletedMission.updatedAt,
        code: def.code,
        name: def.name,
        description: def.description,
        pointsBonus: def.pointsBonus,
        tiePriority: 1,
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const timeDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      const priorityDiff = b.tiePriority - a.tiePriority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return b.code.localeCompare(a.code);
    });

    const best = candidates[0]!;
    return {
      kind: best.kind,
      code: best.code,
      name: best.name,
      description: best.description,
      achievedAt: best.occurredAt,
      pointsBonus: best.pointsBonus,
    };
  }

  async resolveClassParishId(classId: string): Promise<string> {
    const classSnapshot = await this.classService.getClassById(classId);
    return classSnapshot.parishId;
  }

  async listMissionDefinitions(
    query: ListMissionDefinitionsQuery,
  ): Promise<MissionDefinitionListResult> {
    return this.missionService.listDefinitions(query);
  }

  async getMissionDefinitionById(id: string): Promise<MissionDefinitionSnapshot> {
    return this.missionService.getDefinitionById(id);
  }

  async createMissionDefinition(
    input: CreateMissionDefinitionInput,
  ): Promise<MissionDefinitionSnapshot> {
    return this.missionService.createDefinition(input);
  }

  async updateMissionDefinition(
    id: string,
    input: UpdateMissionDefinitionInput,
  ): Promise<MissionDefinitionSnapshot> {
    return this.missionService.updateDefinition(id, input);
  }

  async activateMissionDefinition(id: string): Promise<MissionDefinitionSnapshot> {
    return this.missionService.activateDefinition(id);
  }

  async archiveMissionDefinition(id: string): Promise<MissionDefinitionSnapshot> {
    return this.missionService.archiveDefinition(id);
  }

  async listClassMissions(
    classId: string,
    options: { readonly status?: MissionDefinitionStatus } = {},
  ): Promise<MissionDefinitionSnapshot[]> {
    return this.missionService.listDefinitionsForClass(classId, options);
  }

  async listMissionProgressForStaff(input: {
    readonly missionDefinitionId: string;
    readonly page: number;
    readonly limit: number;
    readonly status?: MissionProgressStatus;
    readonly studentIds?: readonly string[];
  }): Promise<StaffMissionProgressListView> {
    const result = await this.missionService.listProgressPaginated({
      missionDefinitionId: input.missionDefinitionId,
      page: input.page,
      limit: input.limit,
      status: input.status,
      studentIds: input.studentIds,
    });

    const studentIds = result.items.map((row) => row.studentId);
    const snapshots = await this.studentService.getStudentSnapshotsByIds(studentIds);
    const nameById = new Map(snapshots.map((s) => [s.id, s.fullName]));

    return {
      items: result.items.map((row) => ({
        studentId: row.studentId,
        displayName: nameById.get(row.studentId) ?? null,
        currentCount: row.currentCount,
        targetCount: row.targetCount,
        status: row.status,
        completedAt: row.completedAt,
      })),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  async listLearnerMissions(input: {
    readonly studentId: string;
    readonly status?: MissionProgressStatus;
  }): Promise<LearnerMissionView[]> {
    const enrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([input.studentId]);
    const parishId = enrollments[0]?.parishId;
    const classIds = enrollments.map((e) => e.classId);

    if (input.status === MissionProgressStatus.Completed) {
      const progressRows = await this.missionService.listProgressForStudent(input.studentId);
      const completed = progressRows.filter((p) => p.status === MissionProgressStatus.Completed);
      const defs = await this.missionService.listDefinitionsByIds(
        completed.map((p) => p.missionDefinitionId),
      );
      const defById = new Map(defs.map((d) => [d.id, d]));
      return completed
        .map((p) => {
          const d = defById.get(p.missionDefinitionId);
          if (!d) {
            return null;
          }
          return this.toLearnerMissionView(d, p);
        })
        .filter((v): v is LearnerMissionView => v != null);
    }

    if (!parishId) {
      return [];
    }

    const eligible = await this.missionService.listEligibleActiveDefinitionsForLearner({
      parishId,
      classIds,
    });
    const progressRows = await this.missionService.listProgressForStudentByMissionIds(
      input.studentId,
      eligible.map((d) => d.id),
    );
    const progressByMission = new Map(progressRows.map((p) => [p.missionDefinitionId, p]));

    const views = eligible.map((d) => {
      const progress = progressByMission.get(d.id) ?? null;
      return this.toLearnerMissionView(d, progress);
    });

    if (input.status === MissionProgressStatus.Active) {
      return views.filter((v) => v.status === MissionProgressStatus.Active);
    }
    return views;
  }

  async getLearnerMission(input: {
    readonly studentId: string;
    readonly missionId: string;
  }): Promise<LearnerMissionView> {
    const definition = await this.missionService.getDefinitionById(input.missionId);
    const progress = await this.missionService.findProgress(input.missionId, input.studentId);

    if (progress) {
      return this.toLearnerMissionView(definition, progress);
    }

    const enrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([input.studentId]);
    const parishId = enrollments[0]?.parishId;
    const classIds = enrollments.map((e) => e.classId);
    if (!parishId) {
      throw new MissionNotApplicableError();
    }
    const eligible = await this.missionService.listEligibleActiveDefinitionsForLearner({
      parishId,
      classIds,
    });
    if (!eligible.some((d) => d.id === definition.id)) {
      throw new MissionNotApplicableError();
    }
    return this.toLearnerMissionView(definition, null);
  }

  private toLearnerMissionView(
    definition: MissionDefinitionSnapshot,
    progress: MissionProgressSnapshot | null,
  ): LearnerMissionView {
    return {
      id: definition.id,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      conditionType: definition.conditionType,
      currentCount: progress?.currentCount ?? 0,
      targetCount: definition.targetCount,
      status: progress?.status ?? MissionProgressStatus.Active,
      pointsBonus: definition.pointsBonus,
      startsAt: definition.startsAt,
      endsAt: definition.endsAt,
      completedAt: progress?.completedAt ?? null,
    };
  }
}
