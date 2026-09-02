import {
  DEFAULT_EXAM_REVIEW_POLICY,
  EXAM_REVIEW_VISIBILITY_VALUES,
  type ExamReviewPolicy,
  type ExamReviewVisibility,
} from '../constants/exam-review-policy.constants';
import { InvalidExamReviewPolicyError } from '../errors/exam.errors';

function isReviewVisibility(value: unknown): value is ExamReviewVisibility {
  return (
    typeof value === 'string' &&
    (EXAM_REVIEW_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}

function parseReviewPolicyObject(value: unknown): ExamReviewPolicy {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidExamReviewPolicyError();
  }

  const candidate = value as Record<string, unknown>;

  if (
    !isReviewVisibility(candidate['scoreVisibility']) ||
    !isReviewVisibility(candidate['correctAnswerVisibility']) ||
    !isReviewVisibility(candidate['explanationVisibility'])
  ) {
    throw new InvalidExamReviewPolicyError();
  }

  return {
    scoreVisibility: candidate['scoreVisibility'],
    correctAnswerVisibility: candidate['correctAnswerVisibility'],
    explanationVisibility: candidate['explanationVisibility'],
  };
}

export function parseExamReviewPolicy(rawPolicy: ExamReviewPolicy): ExamReviewPolicy {
  return parseReviewPolicyObject(rawPolicy);
}

export function parseExamReviewPolicyJson(rawJson: string): ExamReviewPolicy {
  try {
    const parsed: unknown = JSON.parse(rawJson);

    return parseReviewPolicyObject(parsed);
  } catch (error: unknown) {
    if (error instanceof InvalidExamReviewPolicyError) {
      throw error;
    }

    throw new InvalidExamReviewPolicyError();
  }
}

export function serializeExamReviewPolicy(
  policy: ExamReviewPolicy = DEFAULT_EXAM_REVIEW_POLICY,
): string {
  return JSON.stringify(policy);
}
