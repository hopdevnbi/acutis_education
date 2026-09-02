export const EXAM_REVIEW_VISIBILITY_VALUES = [
  'NEVER',
  'AFTER_SUBMIT',
  'AFTER_ASSIGNMENT_CLOSE',
] as const;

export type ExamReviewVisibility = (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];

export interface ExamReviewPolicy {
  readonly scoreVisibility: ExamReviewVisibility;
  readonly correctAnswerVisibility: ExamReviewVisibility;
  readonly explanationVisibility: ExamReviewVisibility;
}

export const DEFAULT_EXAM_REVIEW_POLICY: ExamReviewPolicy = {
  scoreVisibility: 'AFTER_ASSIGNMENT_CLOSE',
  correctAnswerVisibility: 'AFTER_ASSIGNMENT_CLOSE',
  explanationVisibility: 'AFTER_ASSIGNMENT_CLOSE',
};

export const DEFAULT_EXAM_REVIEW_POLICY_JSON = JSON.stringify(DEFAULT_EXAM_REVIEW_POLICY);
