import { DEFAULT_EXAM_REVIEW_POLICY } from '../constants/exam-review-policy.constants';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { isExamScoreVisible } from './exam-review-visibility.util';

describe('exam-review-visibility.util', () => {
  it('hides score until submit when policy is AFTER_SUBMIT', () => {
    const policy = {
      ...DEFAULT_EXAM_REVIEW_POLICY,
      scoreVisibility: 'AFTER_SUBMIT' as const,
    };

    expect(isExamScoreVisible(policy, ExamAttemptStatus.InProgress, false)).toBe(false);
    expect(isExamScoreVisible(policy, ExamAttemptStatus.Graded, false)).toBe(true);
  });

  it('hides score until assignment closes when policy is AFTER_ASSIGNMENT_CLOSE', () => {
    expect(isExamScoreVisible(DEFAULT_EXAM_REVIEW_POLICY, ExamAttemptStatus.Graded, false)).toBe(
      false,
    );
    expect(isExamScoreVisible(DEFAULT_EXAM_REVIEW_POLICY, ExamAttemptStatus.Graded, true)).toBe(
      true,
    );
  });

  it('never shows score when policy is NEVER', () => {
    const policy = {
      ...DEFAULT_EXAM_REVIEW_POLICY,
      scoreVisibility: 'NEVER' as const,
    };

    expect(isExamScoreVisible(policy, ExamAttemptStatus.Graded, true)).toBe(false);
  });
});
