import { calculateCompletionRatio } from './learning-progress-ratio.util';

describe('learning-progress-ratio.util', () => {
  it('returns 0 when assigned count is 0', () => {
    expect(calculateCompletionRatio(0, 0)).toBe(0);
  });

  it('returns ratio between 0 and 1', () => {
    expect(calculateCompletionRatio(2, 4)).toBe(0.5);
  });
});
