import { REWARD_EVENT_TYPES } from '../../../application-events/contracts/reward-eligible-event.contract';
import { InvalidRewardEventMetadataError } from '../errors/gamification.errors';
import {
  assertRewardEligibleEventShape,
  assertRewardEventMetadata,
} from './reward-event.util';

describe('reward event contract helpers', () => {
  it('accepts allow-listed metadata only', () => {
    expect(() =>
      assertRewardEventMetadata({ attendanceStatus: 'PRESENT', scorePercent: 90 }),
    ).not.toThrow();
    expect(() => assertRewardEventMetadata({ email: 'a@b.c' })).toThrow(
      InvalidRewardEventMetadataError,
    );
    expect(() => assertRewardEventMetadata({ note: 'secret' })).toThrow(
      InvalidRewardEventMetadataError,
    );
  });

  it('validates RewardEligibleEvent shape', () => {
    expect(() =>
      assertRewardEligibleEventShape({
        eventId: '11111111-1111-4111-8111-111111111111',
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
        occurredAt: new Date(),
        studentId: '22222222-2222-4222-8222-222222222222',
        parishId: '33333333-3333-4333-8333-333333333333',
        sourceId: '44444444-4444-4444-8444-444444444444',
        metadata: { canonicalLessonKey: 'L1' },
      }),
    ).not.toThrow();

    expect(() =>
      assertRewardEligibleEventShape({
        eventId: '',
        eventType: REWARD_EVENT_TYPES.ExamCompleted,
        occurredAt: new Date(),
        studentId: 's',
        parishId: 'p',
        sourceId: 'src',
      }),
    ).toThrow();
  });
});
