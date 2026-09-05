import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { RewardEligibleEvent } from '../../application-events/contracts/reward-eligible-event.contract';
import { ApplicationEventBus } from '../../application-events/services/application-event-bus.service';
import type { RewardEligibleEventHandler } from '../../application-events/ports/application-event.ports';
import { RewardIngestService } from '../rewards/services/reward-ingest.service';

@Injectable()
export class RewardEligibleEventListener implements RewardEligibleEventHandler, OnModuleInit {
  private readonly logger = new Logger(RewardEligibleEventListener.name);

  constructor(
    private readonly applicationEventBus: ApplicationEventBus,
    private readonly rewardIngestService: RewardIngestService,
  ) {}

  onModuleInit(): void {
    this.applicationEventBus.registerRewardEligibleHandler(this);
  }

  async handle(event: RewardEligibleEvent): Promise<void> {
    const result = await this.rewardIngestService.ingest(event);
    this.logger.log({
      action: 'gamification.reward_event.ingested',
      eventType: event.eventType,
      eventId: event.eventId,
      sourceId: event.sourceId,
      alreadyProcessed: result.alreadyProcessed,
      ledgerEntriesCreated: result.ledgerEntriesCreated,
      totalPointsAwarded: result.totalPointsAwarded,
      missionsProgressed: result.missionsProgressed,
      missionsCompleted: result.missionsCompleted,
    });

    // Post-commit: publish MISSION_COMPLETED events (separate ingest; no open-txn recursion).
    for (const pending of result.pendingMissionCompletedEvents) {
      try {
        await this.applicationEventBus.publishRewardEligibleEvent(pending);
      } catch (error: unknown) {
        this.logger.error({
          action: 'gamification.mission_completed.publish_failed',
          eventId: pending.eventId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }
}
