import type { CommunicationApplicationEvent } from '../contracts/communication-events.contract';
import type { RewardEligibleEvent } from '../contracts/reward-eligible-event.contract';

export const APPLICATION_EVENT_PUBLISHER = Symbol('APPLICATION_EVENT_PUBLISHER');

export interface ApplicationEventPublisher {
  publishRewardEligibleEvent(event: RewardEligibleEvent): Promise<void>;
  publishCommunicationEvent(event: CommunicationApplicationEvent): Promise<void>;
}

export interface RewardEligibleEventHandler {
  handle(event: RewardEligibleEvent): Promise<void>;
}

export interface CommunicationEventHandler {
  handle(event: CommunicationApplicationEvent): Promise<void>;
}
