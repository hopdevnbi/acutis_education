import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { RewardEligibleEvent } from '../../../application-events/contracts/reward-eligible-event.contract';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import {
  BADGE_AWARD_SOURCE_REWARD_EVENT,
  buildBadgeBonusReasonCode,
} from '../../constants/badge-milestone.constants';
import { PointSourceType } from '../../enums/gamification.enums';
import {
  ActiveBadgeAwardAlreadyExistsError,
  PointLedgerDuplicateIdentityError,
  PointLedgerEntryAlreadyReversedError,
} from '../../errors/gamification.errors';
import type { BadgeDefinitionSnapshot } from '../../interfaces/gamification.interfaces';
import { PointLedgerService } from '../../points/services/point-ledger.service';
import { RewardEventHistoryService } from '../../rewards/services/reward-event-history.service';
import {
  badgeRuleTypeToRewardEventType,
  doesBadgeRuleMatchEvent,
  isBadgeRuleType,
} from '../../utils/badge-rule.util';
import { BadgeService } from './badge.service';

export interface BadgeAwardProcessorResult {
  readonly badgesAwarded: number;
  readonly badgeBonusPointsAwarded: number;
}

@Injectable()
export class BadgeAwardProcessor {
  constructor(
    private readonly badgeService: BadgeService,
    private readonly rewardEventHistoryService: RewardEventHistoryService,
    private readonly pointLedgerService: PointLedgerService,
  ) {}

  async processEvent(
    event: RewardEligibleEvent,
    manager: EntityManager,
  ): Promise<BadgeAwardProcessorResult> {
    const definitions = await this.badgeService.listActiveAutomaticDefinitionsForParish(
      event.parishId,
      manager,
    );

    let badgesAwarded = 0;
    let badgeBonusPointsAwarded = 0;

    for (const definition of definitions) {
      const awarded = await this.tryAwardAutomatic(definition, event, manager);
      if (awarded) {
        badgesAwarded += 1;
        badgeBonusPointsAwarded += awarded.bonusPoints;
      }
    }

    return { badgesAwarded, badgeBonusPointsAwarded };
  }

  private async tryAwardAutomatic(
    definition: BadgeDefinitionSnapshot,
    event: RewardEligibleEvent,
    manager: EntityManager,
  ): Promise<{ bonusPoints: number } | null> {
    if (!definition.ruleEventType || !isBadgeRuleType(definition.ruleEventType)) {
      return null;
    }

    const mappedType = badgeRuleTypeToRewardEventType(definition.ruleEventType);
    const eventCountForMappedType =
      await this.rewardEventHistoryService.countProcessedEventsForStudentByType(
        {
          studentId: event.studentId,
          eventType: mappedType,
        },
        manager,
      );

    if (
      !doesBadgeRuleMatchEvent({
        ruleType: definition.ruleEventType,
        ruleConfigJson: definition.ruleConfigJson,
        event,
        eventCountForMappedType,
      })
    ) {
      return null;
    }

    const existing = await this.badgeService.findActiveAward(
      definition.id,
      event.studentId,
      manager,
    );
    if (existing) {
      return null;
    }

    let award;
    try {
      award = await this.badgeService.createAward(
        {
          badgeDefinitionId: definition.id,
          studentId: event.studentId,
          enrollmentId: event.enrollmentId ?? null,
          parishId: event.parishId,
          sourceType: BADGE_AWARD_SOURCE_REWARD_EVENT,
          sourceId: event.eventId,
          awardedByUserId: null,
          awardedAt: event.occurredAt,
        },
        manager,
      );
    } catch (error: unknown) {
      if (error instanceof ActiveBadgeAwardAlreadyExistsError) {
        return null;
      }
      throw error;
    }

    const bonusPoints = await this.appendBonusIfNeeded({
      definition,
      awardId: award.id,
      studentId: event.studentId,
      enrollmentId: event.enrollmentId ?? null,
      parishId: event.parishId,
      academicYearId: event.academicYearId ?? null,
      awardedByUserId: null,
      manager,
    });

    return { bonusPoints };
  }

  async appendBonusIfNeeded(input: {
    readonly definition: BadgeDefinitionSnapshot;
    readonly awardId: string;
    readonly studentId: string;
    readonly enrollmentId: string | null;
    readonly parishId: string;
    readonly academicYearId: string | null;
    readonly awardedByUserId: string | null;
    readonly manager?: EntityManager;
  }): Promise<number> {
    const bonus = input.definition.pointsBonus ?? 0;
    if (bonus <= 0) {
      return 0;
    }

    const reasonCode = buildBadgeBonusReasonCode(input.definition.code);
    try {
      await this.pointLedgerService.append(
        {
          studentId: input.studentId,
          enrollmentId: input.enrollmentId,
          parishId: input.parishId,
          academicYearId: input.academicYearId,
          pointsDelta: bonus,
          sourceType: PointSourceType.BadgeBonus,
          sourceId: input.awardId,
          reasonCode,
          descriptionKey: `badge_bonus.${input.definition.code}`,
          staffNote: null,
          awardedByUserId: input.awardedByUserId,
        },
        input.manager,
      );
      return bonus;
    } catch (error: unknown) {
      if (error instanceof PointLedgerDuplicateIdentityError) {
        return 0;
      }
      throw error;
    }
  }

  async reverseBonusIfPresent(input: {
    readonly awardId: string;
    readonly actorUserId?: string | null;
    readonly manager?: EntityManager;
  }): Promise<boolean> {
    const awardId = normalizeUuid(input.awardId);
    // Bonus ledger uses sourceType=BADGE_BONUS and sourceId=award.id
    // Find via identity scan of student awards is not needed — reverse by finding ledger rows.
    const bonusEntry = await this.pointLedgerService.findBonusEntryForAward(awardId, input.manager);
    if (!bonusEntry) {
      return false;
    }
    try {
      await this.pointLedgerService.reverseEntry(
        {
          originalEntryId: bonusEntry.id,
          awardedByUserId: input.actorUserId ?? null,
          staffNote: 'badge_revoke_bonus_reversal',
        },
        input.manager,
      );
      return true;
    } catch (error: unknown) {
      if (error instanceof PointLedgerEntryAlreadyReversedError) {
        return false;
      }
      throw error;
    }
  }
}
