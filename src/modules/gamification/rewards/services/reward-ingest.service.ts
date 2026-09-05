import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { RewardEligibleEvent } from '../../../application-events/contracts/reward-eligible-event.contract';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import {
  PointLedgerDuplicateIdentityError,
  RewardEventAlreadyProcessedError,
} from '../../errors/gamification.errors';
import type { RewardIngestResult } from '../../interfaces/gamification.interfaces';
import { assertRewardEligibleEventShape } from '../../utils/reward-event.util';
import { doesRuleMatchEvent } from '../../utils/reward-source-mapping.util';
import { BadgeAwardProcessor } from '../../badges/services/badge-award.processor';
import { MilestoneAchievementProcessor } from '../../milestones/services/milestone-achievement.processor';
import { MissionProgressProcessor } from '../../missions/services/mission-progress.processor';
import { PointLedgerService } from '../../points/services/point-ledger.service';
import { RewardEventReceiptService } from './reward-event-receipt.service';
import { RewardRuleService } from './reward-rule.service';

function emptyAlreadyProcessed(eventId: string): RewardIngestResult {
  return {
    eventId: normalizeUuid(eventId),
    alreadyProcessed: true,
    ledgerEntriesCreated: 0,
    totalPointsAwarded: 0,
    matchedRuleCodes: [],
    badgesAwarded: 0,
    milestonesAchieved: 0,
    missionsProgressed: 0,
    missionsCompleted: 0,
    pendingMissionCompletedEvents: [],
  };
}

@Injectable()
export class RewardIngestService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly rewardEventReceiptService: RewardEventReceiptService,
    private readonly rewardRuleService: RewardRuleService,
    private readonly pointLedgerService: PointLedgerService,
    private readonly badgeAwardProcessor: BadgeAwardProcessor,
    private readonly milestoneAchievementProcessor: MilestoneAchievementProcessor,
    private readonly missionProgressProcessor: MissionProgressProcessor,
  ) {}

  async ingest(event: RewardEligibleEvent): Promise<RewardIngestResult> {
    assertRewardEligibleEventShape(event);

    return this.dataSource.transaction(async (manager) => {
      const existing = await this.rewardEventReceiptService.findByEventId(event.eventId, manager);
      if (existing) {
        return emptyAlreadyProcessed(event.eventId);
      }

      try {
        await this.rewardEventReceiptService.recordProcessed(
          {
            eventId: event.eventId,
            eventType: event.eventType,
            studentId: event.studentId,
            sourceId: event.sourceId,
            parishId: event.parishId,
            enrollmentId: event.enrollmentId ?? null,
            occurredAt: event.occurredAt,
            processedAt: new Date(),
          },
          manager,
        );
      } catch (error: unknown) {
        if (error instanceof RewardEventAlreadyProcessedError) {
          return emptyAlreadyProcessed(event.eventId);
        }
        throw error;
      }

      const rules = await this.rewardRuleService.findActiveMatchingRules({
        eventType: event.eventType,
        parishId: event.parishId,
        at: event.occurredAt,
      });

      const matchedRuleCodes: string[] = [];
      let ledgerEntriesCreated = 0;
      let totalPointsAwarded = 0;

      for (const rule of rules) {
        if (!doesRuleMatchEvent(rule, event)) {
          continue;
        }
        matchedRuleCodes.push(rule.code);

        if (rule.points === 0) {
          continue;
        }

        try {
          await this.pointLedgerService.append(
            {
              studentId: event.studentId,
              enrollmentId: event.enrollmentId ?? null,
              parishId: event.parishId,
              academicYearId: event.academicYearId ?? null,
              pointsDelta: rule.points,
              sourceType: rule.sourceType,
              sourceId: event.sourceId,
              reasonCode: rule.code,
              descriptionKey: `reward_rule.${rule.code}`,
              staffNote: null,
              awardedByUserId: null,
            },
            manager,
          );
          ledgerEntriesCreated += 1;
          totalPointsAwarded += rule.points;
        } catch (error: unknown) {
          if (error instanceof PointLedgerDuplicateIdentityError) {
            continue;
          }
          throw error;
        }
      }

      // Deterministic order: points → badges → milestones → missions.
      // Mission completion events are returned for post-commit publish (no in-txn recursion).
      const badgeResult = await this.badgeAwardProcessor.processEvent(event, manager);
      const milestoneResult = await this.milestoneAchievementProcessor.processEvent(
        event,
        manager,
      );
      const missionResult = await this.missionProgressProcessor.processEvent(event, manager);

      return {
        eventId: normalizeUuid(event.eventId),
        alreadyProcessed: false,
        ledgerEntriesCreated,
        totalPointsAwarded,
        matchedRuleCodes,
        badgesAwarded: badgeResult.badgesAwarded,
        milestonesAchieved: milestoneResult.milestonesAchieved,
        missionsProgressed: missionResult.missionsProgressed,
        missionsCompleted: missionResult.missionsCompleted,
        pendingMissionCompletedEvents: missionResult.pendingMissionCompletedEvents,
      };
    });
  }
}
