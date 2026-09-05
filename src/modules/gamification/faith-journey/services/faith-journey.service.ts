import { Injectable } from '@nestjs/common';
import { EnrollmentQueryService } from '../../../enrollment/services/enrollment-query.service';
import { EnrollmentService } from '../../../enrollment/services/enrollment.service';
import { BadgeService } from '../../badges/services/badge.service';
import { MilestoneService } from '../../milestones/services/milestone.service';
import { MissionService } from '../../missions/services/mission.service';
import { PointLedgerService } from '../../points/services/point-ledger.service';
import {
  MissionProgressStatus,
  PointSourceType,
} from '../../enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  FaithJourneySnapshot,
  FaithJourneyTimelineItemSnapshot,
  GamificationSummarySnapshot,
  LatestAchievementSnapshot,
  LearnerBadgeView,
  LearnerMilestoneView,
  LearnerMissionView,
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionDefinitionSnapshot,
  MissionProgressSnapshot,
  PointLedgerEntrySnapshot,
} from '../../interfaces/gamification.interfaces';

export interface BuildFaithJourneyInput {
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly parishId?: string | null;
}

const MAX_ACTIVE_MISSIONS = 10;
const MAX_RECENT_BADGES = 10;
const MAX_MILESTONES = 20;
const MAX_TIMELINE_ITEMS = 20;

@Injectable()
export class FaithJourneyService {
  constructor(
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly enrollmentService: EnrollmentService,
    private readonly pointLedgerService: PointLedgerService,
    private readonly badgeService: BadgeService,
    private readonly missionService: MissionService,
    private readonly milestoneService: MilestoneService,
  ) {}

  async buildFaithJourney(input: BuildFaithJourneyInput): Promise<FaithJourneySnapshot> {
    let parishId = input.parishId ?? null;
    let classIds: string[] = [];

    if (input.enrollmentId) {
      const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);
      parishId = parishId ?? enrollment.parishId;
      classIds = [enrollment.classId];
    } else {
      const activeEnrollments =
        await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([input.studentId]);
      parishId = parishId ?? activeEnrollments[0]?.parishId ?? null;
      classIds = activeEnrollments.map((e) => e.classId);
    }

    // Fixed bounded set of parallel queries
    const [
      balance,
      pointLedgerResult,
      badgeAwards,
      milestones,
      progressRows,
      eligibleMissions,
    ] = await Promise.all([
      this.pointLedgerService.getBalance({
        studentId: input.studentId,
        parishId,
      }),
      this.pointLedgerService.listPointLedgerPaginated({
        studentId: input.studentId,
        page: 1,
        limit: 30,
        includeStaffNote: false,
      }),
      this.badgeService.listAwardsForStudent(input.studentId, { activeOnly: true }),
      this.milestoneService.listAchievementsForStudent(input.studentId),
      this.missionService.listProgressForStudent(input.studentId),
      parishId
        ? this.missionService.listEligibleActiveDefinitionsForLearner({
            parishId,
            classIds,
          })
        : Promise.resolve([] as MissionDefinitionSnapshot[]),
    ]);

    const completedProgressRows = progressRows.filter(
      (p) => p.status === MissionProgressStatus.Completed,
    );

    // Batch queries for definitions to avoid N+1
    const badgeDefinitionIds = badgeAwards.map((b) => b.badgeDefinitionId);
    const milestoneDefinitionIds = milestones.map((m) => m.milestoneDefinitionId);
    const completedMissionDefinitionIds = completedProgressRows.map((p) => p.missionDefinitionId);

    const [badgeDefMap, milestoneDefMap, completedMissionDefMap] = await Promise.all([
      this.badgeService.findDefinitionsByIds(badgeDefinitionIds),
      this.milestoneService.findDefinitionsByIds(milestoneDefinitionIds),
      this.missionService.findDefinitionsByIds(completedMissionDefinitionIds),
    ]);

    // Latest completed mission progress
    const latestCompletedMission =
      completedProgressRows.length > 0 ? completedProgressRows[0] : null;

    // Resolve latest achievement
    const latestAchievement = this.resolveLatestAchievement({
      latestBadgeAward: badgeAwards[0] ?? null,
      latestBadgeDef: badgeAwards[0]
        ? badgeDefMap.get(badgeAwards[0].badgeDefinitionId) ?? null
        : null,
      latestCompletedMission: latestCompletedMission ?? null,
      latestMissionDef: latestCompletedMission
        ? completedMissionDefMap.get(latestCompletedMission.missionDefinitionId) ?? null
        : null,
      latestMilestoneAchievement: milestones[0] ?? null,
      latestMilestoneDef: milestones[0]
        ? milestoneDefMap.get(milestones[0].milestoneDefinitionId) ?? null
        : null,
    });

    const summary: GamificationSummarySnapshot = {
      studentId: balance.studentId,
      parishId,
      pointsBalance: balance.balance,
      lifetimePositivePoints: balance.lifetimePositivePoints,
      activeBadgeCount: badgeAwards.length,
      activeMissionCount: eligibleMissions.length,
      completedMissionCount: completedProgressRows.length,
      milestoneAchievementCount: milestones.length,
      latestAchievement,
    };

    // Active missions (capped at 10)
    const progressByMissionMap = new Map(progressRows.map((p) => [p.missionDefinitionId, p]));
    const activeMissions: LearnerMissionView[] = eligibleMissions
      .map((def) => {
        const progress = progressByMissionMap.get(def.id) ?? null;
        return {
          id: def.id,
          code: def.code,
          name: def.name,
          description: def.description,
          conditionType: def.conditionType,
          currentCount: progress ? progress.currentCount : 0,
          targetCount: def.targetCount,
          status: progress ? progress.status : MissionProgressStatus.Active,
          pointsBonus: def.pointsBonus,
          startsAt: def.startsAt,
          endsAt: def.endsAt,
          completedAt: progress?.completedAt ?? null,
        };
      })
      .filter((m) => m.status === MissionProgressStatus.Active)
      .slice(0, MAX_ACTIVE_MISSIONS);

    // Recent badges (capped at 10)
    const recentBadges: LearnerBadgeView[] = badgeAwards
      .map((award) => {
        const def = badgeDefMap.get(award.badgeDefinitionId);
        if (!def) {
          return null;
        }
        return {
          id: def.id,
          code: def.code,
          name: def.name,
          description: def.description,
          category: def.category,
          iconMediaAssetId: def.iconMediaAssetId,
          awardedAt: award.awardedAt,
          pointsBonus: def.pointsBonus,
        };
      })
      .filter((v): v is LearnerBadgeView => v !== null)
      .slice(0, MAX_RECENT_BADGES);

    // Milestones (capped at 20)
    const learnerMilestones: LearnerMilestoneView[] = milestones
      .map((ach) => {
        const def = milestoneDefMap.get(ach.milestoneDefinitionId);
        if (!def) {
          return null;
        }
        return {
          id: def.id,
          code: def.code,
          name: def.name,
          description: def.description,
          sortOrder: def.sortOrder,
          achievedAt: ach.achievedAt,
        };
      })
      .filter((v): v is LearnerMilestoneView => v !== null)
      .slice(0, MAX_MILESTONES);

    // Timeline items composition (capped at 20, no manual adjustments, no PII, no staffNote)
    const recentTimeline = this.composeTimeline({
      pointLedgerEntries: pointLedgerResult.items,
      badgeAwards,
      badgeDefMap,
      completedProgressRows,
      completedMissionDefMap,
      milestones,
      milestoneDefMap,
    });

    return {
      summary,
      activeMissions,
      recentBadges,
      milestones: learnerMilestones,
      recentTimeline,
    };
  }

  private resolveLatestAchievement(input: {
    readonly latestBadgeAward: BadgeAwardSnapshot | null;
    readonly latestBadgeDef: BadgeDefinitionSnapshot | null;
    readonly latestCompletedMission: MissionProgressSnapshot | null;
    readonly latestMissionDef: MissionDefinitionSnapshot | null;
    readonly latestMilestoneAchievement: MilestoneAchievementSnapshot | null;
    readonly latestMilestoneDef: MilestoneDefinitionSnapshot | null;
  }): LatestAchievementSnapshot | null {
    const candidates: Array<{
      readonly kind: 'MILESTONE' | 'BADGE' | 'MISSION';
      readonly occurredAt: Date;
      readonly code: string;
      readonly name: string;
      readonly description: string | null;
      readonly pointsBonus?: number | null;
      readonly tiePriority: number;
    }> = [];

    if (input.latestMilestoneAchievement && input.latestMilestoneDef) {
      candidates.push({
        kind: 'MILESTONE',
        occurredAt: input.latestMilestoneAchievement.achievedAt,
        code: input.latestMilestoneDef.code,
        name: input.latestMilestoneDef.name,
        description: input.latestMilestoneDef.description,
        pointsBonus: null,
        tiePriority: 3,
      });
    }

    if (input.latestBadgeAward && input.latestBadgeDef) {
      candidates.push({
        kind: 'BADGE',
        occurredAt: input.latestBadgeAward.awardedAt,
        code: input.latestBadgeDef.code,
        name: input.latestBadgeDef.name,
        description: input.latestBadgeDef.description,
        pointsBonus: input.latestBadgeDef.pointsBonus,
        tiePriority: 2,
      });
    }

    if (input.latestCompletedMission && input.latestMissionDef) {
      candidates.push({
        kind: 'MISSION',
        occurredAt:
          input.latestCompletedMission.completedAt ??
          input.latestCompletedMission.updatedAt,
        code: input.latestMissionDef.code,
        name: input.latestMissionDef.name,
        description: input.latestMissionDef.description,
        pointsBonus: input.latestMissionDef.pointsBonus,
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

  private composeTimeline(input: {
    readonly pointLedgerEntries: readonly PointLedgerEntrySnapshot[];
    readonly badgeAwards: readonly BadgeAwardSnapshot[];
    readonly badgeDefMap: Map<string, BadgeDefinitionSnapshot>;
    readonly completedProgressRows: readonly MissionProgressSnapshot[];
    readonly completedMissionDefMap: Map<string, MissionDefinitionSnapshot>;
    readonly milestones: readonly MilestoneAchievementSnapshot[];
    readonly milestoneDefMap: Map<string, MilestoneDefinitionSnapshot>;
  }): FaithJourneyTimelineItemSnapshot[] {
    const items: FaithJourneyTimelineItemSnapshot[] = [];

    // 1. Points (exclude manual adjustments, reversals, and badge/mission bonuses to avoid duplication)
    for (const entry of input.pointLedgerEntries) {
      if (
        entry.sourceType === PointSourceType.ManualAward ||
        entry.sourceType === PointSourceType.Adjustment ||
        entry.sourceType === PointSourceType.Reversal ||
        entry.sourceType === PointSourceType.BadgeBonus ||
        entry.sourceType === PointSourceType.MissionCompleted
      ) {
        continue;
      }
      items.push({
        type: 'POINTS',
        occurredAt: entry.createdAt,
        code: entry.reasonCode,
        title: entry.reasonCode,
        descriptionKey: entry.descriptionKey ?? null,
        pointsDelta: entry.pointsDelta,
        relatedId: entry.id,
      });
    }

    // 2. Badges
    for (const award of input.badgeAwards) {
      const def = input.badgeDefMap.get(award.badgeDefinitionId);
      items.push({
        type: 'BADGE',
        occurredAt: award.awardedAt,
        code: def?.code ?? 'BADGE',
        title: def?.name ?? 'Badge Awarded',
        descriptionKey: def?.description ?? null,
        pointsDelta: def?.pointsBonus ?? null,
        relatedId: award.id,
      });
    }

    // 3. Missions
    for (const progress of input.completedProgressRows) {
      const def = input.completedMissionDefMap.get(progress.missionDefinitionId);
      items.push({
        type: 'MISSION',
        occurredAt: progress.completedAt ?? progress.updatedAt,
        code: def?.code ?? 'MISSION',
        title: def?.name ?? 'Mission Completed',
        descriptionKey: def?.description ?? null,
        pointsDelta: def?.pointsBonus ?? null,
        relatedId: progress.id,
      });
    }

    // 4. Milestones
    for (const milestone of input.milestones) {
      const def = input.milestoneDefMap.get(milestone.milestoneDefinitionId);
      items.push({
        type: 'MILESTONE',
        occurredAt: milestone.achievedAt,
        code: def?.code ?? 'MILESTONE',
        title: def?.name ?? 'Milestone Achieved',
        descriptionKey: def?.description ?? null,
        pointsDelta: null,
        relatedId: milestone.id,
      });
    }

    // Deterministic sort: occurredAt DESC, then type priority, then code, then relatedId
    const typePriority: Record<FaithJourneyTimelineItemSnapshot['type'], number> = {
      MILESTONE: 4,
      BADGE: 3,
      MISSION: 2,
      POINTS: 1,
    };

    items.sort((a, b) => {
      const timeDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      const priorityDiff = typePriority[b.type] - typePriority[a.type];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const codeDiff = a.code.localeCompare(b.code);
      if (codeDiff !== 0) {
        return codeDiff;
      }
      return (a.relatedId ?? '').localeCompare(b.relatedId ?? '');
    });

    return items.slice(0, MAX_TIMELINE_ITEMS);
  }
}
