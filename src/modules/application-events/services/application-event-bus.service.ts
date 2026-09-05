import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationApplicationEvent } from '../contracts/communication-events.contract';
import type { RewardEligibleEvent } from '../contracts/reward-eligible-event.contract';
import type {
  ApplicationEventPublisher,
  CommunicationEventHandler,
  RewardEligibleEventHandler,
} from '../ports/application-event.ports';

/**
 * Lightweight in-process event bus.
 * At-least-once best effort; no outbox. Handlers are isolated so publisher
 * failures do not throw to source-domain callers.
 */
@Injectable()
export class ApplicationEventBus implements ApplicationEventPublisher {
  private readonly logger = new Logger(ApplicationEventBus.name);
  private readonly rewardEligibleHandlers: RewardEligibleEventHandler[] = [];
  private readonly communicationHandlers: CommunicationEventHandler[] = [];

  registerRewardEligibleHandler(handler: RewardEligibleEventHandler): void {
    this.rewardEligibleHandlers.push(handler);
  }

  registerCommunicationHandler(handler: CommunicationEventHandler): void {
    this.communicationHandlers.push(handler);
  }

  async publishRewardEligibleEvent(event: RewardEligibleEvent): Promise<void> {
    for (const handler of this.rewardEligibleHandlers) {
      try {
        await handler.handle(event);
      } catch (error: unknown) {
        this.logger.error({
          action: 'application_events.reward_eligible.handler_failed',
          eventType: event.eventType,
          eventId: event.eventId,
          sourceId: event.sourceId,
          message: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
  }

  async publishCommunicationEvent(event: CommunicationApplicationEvent): Promise<void> {
    for (const handler of this.communicationHandlers) {
      try {
        await handler.handle(event);
      } catch (error: unknown) {
        this.logger.error({
          action: 'application_events.communication.handler_failed',
          eventType: event.eventType,
          applicationEventId: event.applicationEventId,
          operationKey: event.operationKey,
          message: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
  }
}
