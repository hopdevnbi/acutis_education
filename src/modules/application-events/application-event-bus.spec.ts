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
      classId: '55555555-5555-4555-8555-555555555555',
      parishId: '33333333-3333-4333-8333-333333333333',
      sourceId: '44444444-4444-4444-8444-444444444444',
    };

    await expect(bus.publishRewardEligibleEvent(event)).resolves.toBeUndefined();
    expect(ok.handle).toHaveBeenCalled();
    expect(bad.handle).toHaveBeenCalled();
  });

  it('isolates communication event handler failures so source callers do not throw', async () => {
    const bus = new ApplicationEventBus();
    const ok = { handle: jest.fn().mockResolvedValue(undefined) };
    const bad = {
      handle: jest.fn().mockRejectedValue(new Error('notification handler failed')),
    };
    bus.registerCommunicationHandler(ok);
    bus.registerCommunicationHandler(bad);

    const event = {
      applicationEventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      operationKey: 'ANNOUNCEMENT_PUBLISHED:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      eventType: 'ANNOUNCEMENT_PUBLISHED' as const,
      announcementId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Parish Festival Announcement',
      snippet: 'Join us this weekend',
      priority: 'NORMAL' as const,
      targets: [{ targetType: 'PARISH' as const, parishId: '33333333-3333-4333-8333-333333333333' }],
      occurredAt: new Date(),
      publishedAt: new Date(),
    };

    await expect(bus.publishCommunicationEvent(event)).resolves.toBeUndefined();
    expect(ok.handle).toHaveBeenCalledWith(event);
    expect(bad.handle).toHaveBeenCalledWith(event);
  });
});
