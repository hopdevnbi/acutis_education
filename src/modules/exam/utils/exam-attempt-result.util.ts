import type { ExamReviewPolicy } from '../constants/exam-review-policy.constants';
import type { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import type {
  GradeAnswerResult,
  PracticeFeedbackSnapshot,
} from '../../question-bank/interfaces/question-bank.interface';
import type {
  ExamAttemptQuestionReviewSnapshot,
  ExamAttemptResultSnapshot,
} from '../interfaces/exam-attempt.interface';
import {
  isExamCorrectAnswerVisible,
  isExamExplanationVisible,
  isExamScoreVisible,
} from './exam-review-visibility.util';

export interface BuildExamAttemptResultInput {
  readonly reviewPolicy: ExamReviewPolicy;
  readonly attemptStatus: ExamAttemptStatus;
  readonly assignmentClosed: boolean;
  readonly correctCount: number | null;
  readonly scorePercent: string | null;
  readonly passed: boolean | null;
  readonly autoSubmitReason: string | null;
  readonly questions: readonly {
    readonly examAttemptQuestionId: string;
    readonly sortOrder: number;
    readonly prompt: string;
    readonly questionType: ExamAttemptQuestionReviewSnapshot['questionType'];
    readonly questionVersionId: string;
    readonly selectedOptionIds: readonly string[];
  }[];
  readonly feedbackByQuestionVersionId: ReadonlyMap<string, PracticeFeedbackSnapshot>;
  readonly gradeByQuestionVersionId: ReadonlyMap<string, GradeAnswerResult>;
}

export function buildExamAttemptResultSnapshot(
  input: BuildExamAttemptResultInput,
): ExamAttemptResultSnapshot | null {
  const showScore = isExamScoreVisible(
    input.reviewPolicy,
    input.attemptStatus,
    input.assignmentClosed,
  );

  if (!showScore) {
    return null;
  }

  const showCorrectAnswers = isExamCorrectAnswerVisible(
    input.reviewPolicy,
    input.attemptStatus,
    input.assignmentClosed,
  );
  const showExplanation = isExamExplanationVisible(
    input.reviewPolicy,
    input.attemptStatus,
    input.assignmentClosed,
  );
  const showQuestionReview = showScore || showCorrectAnswers || showExplanation;
  const questions = showQuestionReview
    ? input.questions.map((question) => {
        const gradeResult = input.gradeByQuestionVersionId.get(question.questionVersionId);
        const feedback = input.feedbackByQuestionVersionId.get(question.questionVersionId);

        return {
          examAttemptQuestionId: question.examAttemptQuestionId,
          sortOrder: question.sortOrder,
          prompt: question.prompt,
          questionType: question.questionType,
          selectedOptionIds: [...question.selectedOptionIds],
          isCorrect: gradeResult?.isCorrect ?? false,
          correctOptionIds:
            showCorrectAnswers && feedback !== undefined ? [...feedback.correctOptionIds] : null,
          explanation: showExplanation && feedback !== undefined ? feedback.explanation : null,
          explanationMediaJson:
            showExplanation && feedback !== undefined ? feedback.explanationMediaJson : null,
        };
      })
    : null;

  return {
    correctCount: input.correctCount,
    scorePercent: input.scorePercent,
    passed: input.passed,
    autoSubmitReason: input.autoSubmitReason,
    questions,
  };
}
