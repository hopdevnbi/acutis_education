import type {
  ExamReviewPolicy,
  ExamReviewVisibility,
} from '../constants/exam-review-policy.constants';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';

function isVisibilityMet(
  visibility: ExamReviewVisibility,
  attemptStatus: ExamAttemptStatus,
  assignmentClosed: boolean,
): boolean {
  if (visibility === 'NEVER') {
    return false;
  }

  if (visibility === 'AFTER_SUBMIT') {
    return (
      attemptStatus === ExamAttemptStatus.Submitted || attemptStatus === ExamAttemptStatus.Graded
    );
  }

  return assignmentClosed;
}

export function isExamScoreVisible(
  policy: ExamReviewPolicy,
  attemptStatus: ExamAttemptStatus,
  assignmentClosed: boolean,
): boolean {
  return isVisibilityMet(policy.scoreVisibility, attemptStatus, assignmentClosed);
}
