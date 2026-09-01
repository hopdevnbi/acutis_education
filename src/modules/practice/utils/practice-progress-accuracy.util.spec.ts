import { calculatePracticeAccuracy } from './practice-progress-accuracy.util';

describe('calculatePracticeAccuracy', () => {
  it('returns 0 when denominator is zero', () => {
    expect(calculatePracticeAccuracy(0, 0)).toBe(0);
    expect(calculatePracticeAccuracy(3, 0)).toBe(0);
  });

  it('returns ratio for non-zero denominator', () => {
    expect(calculatePracticeAccuracy(1, 4)).toBe(0.25);
    expect(calculatePracticeAccuracy(3, 3)).toBe(1);
  });
});
