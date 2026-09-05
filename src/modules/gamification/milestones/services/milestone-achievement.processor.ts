import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { RewardEligibleEvent } from '../../../application-events/contracts/reward-eligible-event.contract';
import { MILESTONE_ACHIEVEMENT_SOURCE_REWARD_EVENT } from '../../constants/badge-milestone.constants';
import { MilestoneAchievementAlreadyExistsError } from '../../errors/gamification.errors';
import type { MilestoneDefinitionSnapshot } from '../../interfaces/gamification.interfaces';
import { RewardEventHistoryService } from '../../rewards/services/reward-event-history.service';
import {
  doesMilestoneTriggerMatchEvent,
  milestoneTriggerToRewardEventType,
} from '../../utils/milestone-trigger.util';
import { MilestoneService } from './milestone.service';

export interface MilestoneAchievementProcessorResult {
  readonly milestonesAchieved: number;
}

@Injectable()
export class MilestoneAchievementProcessor {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly rewardEventHistoryService: RewardEventHistoryService,
  ) {}

  async processEvent(
    event: RewardEligibleEvent,
    manager: EntityManager,
  ): Promise<MilestoneAchievementProcessorResult> {
    const definitions = await this.milestoneService.listActiveDefinitions(manager);
    let milestonesAchieved = 0;

    for (const definition of definitions) {
      const created = await this.tryAchieve(definition, event, manager);
      if (created) {
        milestonesAchieved += 1;
      }
    }

    return { milestonesAchieved };
  }

  private async tryAchieve(
    definition: MilestoneDefinitionSnapshot,
    event: RewardEligibleEvent,
    manager: EntityManager,
  ): Promise<boolean> {
    const mappedType = milestoneTriggerToRewardEventType(definition.triggerType);
    const eventCountForMappedType =
      mappedType === null
        ? 0
        : await this.rewardEventHistoryService.countProcessedEventsForStudentByType(
            {
              studentId: event.studentId,
              eventType: mappedType,
            },
            manager,
          );

    if (
      !doesMilestoneTriggerMatchEvent({
        triggerType: definition.triggerType,
        triggerConfigJson: definition.triggerConfigJson,
        event,
        eventCountForMappedType,
      })
    ) {
      return false;
    }

    const existing = await this.milestoneService.findAchievement(
      definition.id,
      event.studentId,
      manager,
    );
    if (existing) {
      return false;
    }

    try {
      await this.milestoneService.createAchievement(
        {
          milestoneDefinitionId: definition.id,
          studentId: event.studentId,
          enrollmentId: event.enrollmentId ?? null,
          parishId: event.parishId,
          sourceType: MILESTONE_ACHIEVEMENT_SOURCE_REWARD_EVENT,
          sourceId: event.eventId,
          achievedAt: event.occurredAt,
        },
        manager,
      );
      return true;
    } catch (error: unknown) {
      if (error instanceof MilestoneAchievementAlreadyExistsError) {
        return false;
      }
      throw error;
    }
  }
}
