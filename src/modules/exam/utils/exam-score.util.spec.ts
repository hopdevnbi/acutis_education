import { computeExamPassed, computeExamScorePercent } from './exam-score.util';

describe('exam-score.util', () => {
  it('computes rounded score percent', () => {
    expect(computeExamScorePercent(2, 3)).toBe('67.00');
    expect(computeExamScorePercent(0, 5)).toBe('0.00');
    expect(computeExamScorePercent(5, 5)).toBe('100.00');
  });

  it('returns zero percent when question count is zero', () => {
    expect(computeExamScorePercent(0, 0)).toBe('0.00');
  });

  it('computes pass when score meets threshold', () => {
    expect(computeExamPassed('70.00', '70.00')).toBe(true);
    expect(computeExamPassed('69.99', '70.00')).toBe(false);
    expect(computeExamPassed('80.00', null)).toBe(null);
  });
});
