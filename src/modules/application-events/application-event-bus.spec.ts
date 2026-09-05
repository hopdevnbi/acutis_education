import { ApplicationEventBus } from './services/application-event-bus.service';
import type { RewardEligibleEvent } from './contracts/reward-eligible-event.contract';
import { REWARD_EVENT_TYPES } from './contracts/reward-eligible-event.contract';

describe('ApplicationEventBus', () => {
  it('isolates handler failures so source callers do not throw', async () => {
    const bus = new ApplicationEventBus();
    const ok = { handle: jest.fn().mockResolvedValue(undefined) };
    const bad = {
      handle: jest.fn().mockRejectedValue(new Error('reward failed')),
    };
    bus.registerRewardEligibleHandler(ok);
    bus.registerRewardEligibleHandler(bad);

    const event: RewardEligibleEvent = {
      eventId: '11111111-1111-4111-8111-111111111111',
      eventType: REWARD_EVENT_TYPES.PracticeCompleted,
      occurredAt: new Date(),
      studentId: '22222222-2222-4222-8222-222222222222',
      parishId: '33333333-3333-4333-8333-333333333333',
      sourceId: '44444444-4444-4444-8444-444444444444',
    };

    await expect(bus.publishRewardEligibleEvent(event)).resolves.toBeUndefined();
    expect(ok.handle).toHaveBeenCalled();
    expect(bad.handle).toHaveBeenCalled();
  });
});
