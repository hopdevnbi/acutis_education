import { isBadgeAwardActive } from '../../utils/reward-event.util';

describe('badge award uniqueness model helpers', () => {
  it('treats null revokedAt as active (non-repeatable filtered unique)', () => {
    expect(isBadgeAwardActive(null)).toBe(true);
    expect(isBadgeAwardActive(new Date())).toBe(false);
  });
});
