import { FaithJourneyService } from './faith-journey.service';
import {
  MissionProgressStatus,
  PointSourceType,
} from '../../enums/gamification.enums';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
  MissionDefinitionSnapshot,
  MissionProgressSnapshot,
  PointLedgerEntrySnapshot,
} from '../../interfaces/gamification.interfaces';

describe('FaithJourneyService unit tests', () => {
  let enrollmentQueryService: { listActiveEnrollmentsByStudentIds: jest.Mock };
  let enrollmentService: { getEnrollmentById: jest.Mock };
  let pointLedgerService: { getBalance: jest.Mock; listPointLedgerPaginated: jest.Mock };
  let badgeService: { listAwardsForStudent: jest.Mock; findDefinitionsByIds: jest.Mock };
  let missionService: {
    listEligibleActiveDefinitionsForLearner: jest.Mock;
    listProgressForStudent: jest.Mock;
    findDefinitionsByIds: jest.Mock;
  };
  let milestoneService: { listAchievementsForStudent: jest.Mock; findDefinitionsByIds: jest.Mock };
  let service: FaithJourneyService;

  beforeEach(() => {
    enrollmentQueryService = {
      listActiveEnrollmentsByStudentIds: jest.fn().mockResolvedValue([
        {
          id: 'e-1',
          studentId: 'student-1',
          classId: 'class-1',
          parishId: 'parish-1',
        },
      ]),
    };
    enrollmentService = {
      getEnrollmentById: jest.fn().mockResolvedValue({
        id: 'e-1',
        studentId: 'student-1',
        classId: 'class-1',
        parishId: 'parish-1',
      }),
    };
    pointLedgerService = {
      getBalance: jest.fn().mockResolvedValue({
        studentId: 'student-1',
        balance: 150,
        lifetimePositivePoints: 200,
      }),
      listPointLedgerPaginated: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        limit: 30,
        total: 0,
        totalPages: 0,
      }),
    };
    badgeService = {
      listAwardsForStudent: jest.fn().mockResolvedValue([]),
      findDefinitionsByIds: jest.fn().mockResolvedValue(new Map()),
    };
    missionService = {
      listEligibleActiveDefinitionsForLearner: jest.fn().mockResolvedValue([]),
      listProgressForStudent: jest.fn().mockResolvedValue([]),
      findDefinitionsByIds: jest.fn().mockResolvedValue(new Map()),
    };
    milestoneService = {
      listAchievementsForStudent: jest.fn().mockResolvedValue([]),
      findDefinitionsByIds: jest.fn().mockResolvedValue(new Map()),
    };

    service = new FaithJourneyService(
      enrollmentQueryService as never,
      enrollmentService as never,
      pointLedgerService as never,
      badgeService as never,
      missionService as never,
      milestoneService as never,
    );
  });

  describe('Summary & LatestAchievement composition', () => {
    it('composes canonical summary with latestAchievement null when no awards/missions/milestones', async () => {
      const result = await service.buildFaithJourney({ studentId: 'student-1' });

      expect(result.summary.pointsBalance).toBe(150);
      expect(result.summary.lifetimePositivePoints).toBe(200);
      expect(result.summary.activeBadgeCount).toBe(0);
      expect(result.summary.activeMissionCount).toBe(0);
      expect(result.summary.completedMissionCount).toBe(0);
      expect(result.summary.milestoneAchievementCount).toBe(0);
      expect(result.summary.latestAchievement).toBeNull();
      expect(result.activeMissions).toEqual([]);
      expect(result.recentBadges).toEqual([]);
      expect(result.milestones).toEqual([]);
      expect(result.recentTimeline).toEqual([]);
    });

    it('selects latestAchievement deterministically based on occurredAt timestamp', async () => {
      const earlierDate = new Date('2026-09-01T10:00:00Z');
      const laterDate = new Date('2026-09-03T10:00:00Z');

      const badgeAward: BadgeAwardSnapshot = {
        id: 'award-1',
        badgeDefinitionId: 'badge-def-1',
        studentId: 'student-1',
        enrollmentId: null,
        parishId: 'parish-1',
        sourceType: 'EVENT',
        sourceId: 'event-1',
        awardedAt: earlierDate,
        revokedAt: null,
        awardedByUserId: null,
        createdAt: earlierDate,
      };
      const badgeDef: BadgeDefinitionSnapshot = {
        id: 'badge-def-1',
        code: 'BADGE_PRAYER',
        name: 'Daily Prayer',
        description: 'Prayed daily',
        category: 'FAITH',
        scopeType: 'GLOBAL' as never,
        parishId: null,
        status: 'ACTIVE' as never,
        awardMode: 'AUTOMATIC' as never,
        ruleEventType: null,
        ruleConfigJson: null,
        pointsBonus: 20,
        iconMediaAssetId: null,
        createdAt: earlierDate,
        updatedAt: earlierDate,
      };

      const milestoneAch: MilestoneAchievementSnapshot = {
        id: 'ach-1',
        milestoneDefinitionId: 'ms-def-1',
        studentId: 'student-1',
        enrollmentId: null,
        parishId: 'parish-1',
        achievedAt: laterDate,
        sourceType: 'EVENT',
        sourceId: 'event-2',
        createdAt: laterDate,
      };
      const milestoneDef: MilestoneDefinitionSnapshot = {
        id: 'ms-def-1',
        code: 'FIRST_LESSON_DONE',
        name: 'First Lesson Completed',
        description: 'Completed your first catechism lesson',
        status: 'ACTIVE' as never,
        triggerType: 'FIRST_LESSON_COMPLETED' as never,
        triggerConfigJson: null,
        sortOrder: 1,
        createdAt: laterDate,
        updatedAt: laterDate,
      };

      badgeService.listAwardsForStudent.mockResolvedValue([badgeAward]);
      badgeService.findDefinitionsByIds.mockResolvedValue(new Map([['badge-def-1', badgeDef]]));
      milestoneService.listAchievementsForStudent.mockResolvedValue([milestoneAch]);
      milestoneService.findDefinitionsByIds.mockResolvedValue(new Map([['ms-def-1', milestoneDef]]));

      const result = await service.buildFaithJourney({ studentId: 'student-1' });

      expect(result.summary.latestAchievement).not.toBeNull();
      expect(result.summary.latestAchievement?.kind).toBe('MILESTONE');
      expect(result.summary.latestAchievement?.code).toBe('FIRST_LESSON_DONE');
      expect(result.summary.latestAchievement?.achievedAt).toEqual(laterDate);
    });

    it('resolves tie-breaker deterministically when timestamps match (MILESTONE > BADGE > MISSION)', async () => {
      const sameTime = new Date('2026-09-02T12:00:00Z');

      const badgeAward: BadgeAwardSnapshot = {
        id: 'award-1',
        badgeDefinitionId: 'badge-def-1',
        studentId: 'student-1',
        enrollmentId: null,
        parishId: 'parish-1',
        sourceType: 'EVENT',
        sourceId: 'event-1',
        awardedAt: sameTime,
        revokedAt: null,
        awardedByUserId: null,
        createdAt: sameTime,
      };
      const badgeDef: BadgeDefinitionSnapshot = {
        id: 'badge-def-1',
        code: 'BADGE_A',
        name: 'Badge A',
        description: null,
        category: 'FAITH',
        scopeType: 'GLOBAL' as never,
        parishId: null,
        status: 'ACTIVE' as never,
        awardMode: 'AUTOMATIC' as never,
        ruleEventType: null,
        ruleConfigJson: null,
        pointsBonus: 10,
        iconMediaAssetId: null,
        createdAt: sameTime,
        updatedAt: sameTime,
      };

      const milestoneAch: MilestoneAchievementSnapshot = {
        id: 'ach-1',
        milestoneDefinitionId: 'ms-def-1',
        studentId: 'student-1',
        enrollmentId: null,
        parishId: 'parish-1',
        achievedAt: sameTime,
        sourceType: 'EVENT',
        sourceId: 'event-2',
        createdAt: sameTime,
      };
      const milestoneDef: MilestoneDefinitionSnapshot = {
        id: 'ms-def-1',
        code: 'MS_A',
        name: 'Milestone A',
        description: null,
        status: 'ACTIVE' as never,
        triggerType: 'FIRST_LESSON_COMPLETED' as never,
        triggerConfigJson: null,
        sortOrder: 1,
        createdAt: sameTime,
        updatedAt: sameTime,
      };

      badgeService.listAwardsForStudent.mockResolvedValue([badgeAward]);
      badgeService.findDefinitionsByIds.mockResolvedValue(new Map([['badge-def-1', badgeDef]]));
      milestoneService.listAchievementsForStudent.mockResolvedValue([milestoneAch]);
      milestoneService.findDefinitionsByIds.mockResolvedValue(new Map([['ms-def-1', milestoneDef]]));

      const result = await service.buildFaithJourney({ studentId: 'student-1' });

      expect(result.summary.latestAchievement?.kind).toBe('MILESTONE');
    });
  });

  describe('Timeline composition and privacy', () => {
    it('composes timeline and excludes manual adjustments and reversals', async () => {
      const now = new Date('2026-09-05T12:00:00Z');
      const pointEntries: PointLedgerEntrySnapshot[] = [
        {
          id: 'ple-1',
          studentId: 'student-1',
          enrollmentId: 'e-1',
          parishId: 'parish-1',
          academicYearId: null,
          pointsDelta: 10,
          sourceType: PointSourceType.LessonCompleted,
          sourceId: 'lesson-1',
          reasonCode: 'LESSON_COMPLETED',
          descriptionKey: 'lesson.completed',
          staffNote: 'internal note that must never be exposed',
          awardedByUserId: 'staff-1',
          relatedLedgerEntryId: null,
          createdAt: new Date('2026-09-05T11:00:00Z'),
        },
        {
          id: 'ple-2',
          studentId: 'student-1',
          enrollmentId: 'e-1',
          parishId: 'parish-1',
          academicYearId: null,
          pointsDelta: 50,
          sourceType: PointSourceType.ManualAward,
          sourceId: 'manual-1',
          reasonCode: 'MANUAL_AWARD',
          descriptionKey: null,
          staffNote: 'secret staff note',
          awardedByUserId: 'admin-1',
          relatedLedgerEntryId: null,
          createdAt: now,
        },
        {
          id: 'ple-3',
          studentId: 'student-1',
          enrollmentId: 'e-1',
          parishId: 'parish-1',
          academicYearId: null,
          pointsDelta: -10,
          sourceType: PointSourceType.Adjustment,
          sourceId: 'adj-1',
          reasonCode: 'ADJUSTMENT',
          descriptionKey: null,
          staffNote: 'penalty note',
          awardedByUserId: 'admin-1',
          relatedLedgerEntryId: null,
          createdAt: now,
        },
        {
          id: 'ple-4',
          studentId: 'student-1',
          enrollmentId: 'e-1',
          parishId: 'parish-1',
          academicYearId: null,
          pointsDelta: -10,
          sourceType: PointSourceType.Reversal,
          sourceId: 'ple-1',
          reasonCode: 'REVERSAL',
          descriptionKey: null,
          staffNote: null,
          awardedByUserId: 'admin-1',
          relatedLedgerEntryId: 'ple-1',
          createdAt: now,
        },
      ];

      pointLedgerService.listPointLedgerPaginated.mockResolvedValue({
        items: pointEntries,
        page: 1,
        limit: 30,
        total: 4,
        totalPages: 1,
      });

      const result = await service.buildFaithJourney({ studentId: 'student-1' });

      expect(result.recentTimeline).toHaveLength(1);
      expect(result.recentTimeline[0]!.type).toBe('POINTS');
      expect(result.recentTimeline[0]!.code).toBe('LESSON_COMPLETED');
      expect(result.recentTimeline[0]!.pointsDelta).toBe(10);
      expect((result.recentTimeline[0] as unknown as { staffNote?: string }).staffNote).toBeUndefined();
    });

    it('caps timeline items at maximum 20', async () => {
      const items: PointLedgerEntrySnapshot[] = Array.from({ length: 30 }).map((_, i) => ({
        id: `ple-${i}`,
        studentId: 'student-1',
        enrollmentId: 'e-1',
        parishId: 'parish-1',
        academicYearId: null,
        pointsDelta: 5,
        sourceType: PointSourceType.LessonCompleted,
        sourceId: `source-${i}`,
        reasonCode: `LESSON_${i}`,
        descriptionKey: null,
        staffNote: null,
        awardedByUserId: null,
        relatedLedgerEntryId: null,
        createdAt: new Date(Date.now() - i * 1000),
      }));

      pointLedgerService.listPointLedgerPaginated.mockResolvedValue({
        items,
        page: 1,
        limit: 30,
        total: 30,
        totalPages: 1,
      });

      const result = await service.buildFaithJourney({ studentId: 'student-1' });

      expect(result.recentTimeline.length).toBeLessThanOrEqual(20);
      expect(result.recentTimeline.length).toBe(20);
    });
  });

  describe('Batch definition queries (N+1 resolution)', () => {
    it('uses batch findDefinitionsByIds rather than individual queries', async () => {
      const awards = [
        { id: 'a-1', badgeDefinitionId: 'b-1', studentId: 'student-1', awardedAt: new Date() },
        { id: 'a-2', badgeDefinitionId: 'b-2', studentId: 'student-1', awardedAt: new Date() },
      ];
      badgeService.listAwardsForStudent.mockResolvedValue(awards);

      await service.buildFaithJourney({ studentId: 'student-1' });

      expect(badgeService.findDefinitionsByIds).toHaveBeenCalledWith(['b-1', 'b-2']);
      expect(milestoneService.findDefinitionsByIds).toHaveBeenCalledWith([]);
    });
  });
});
