import { DEFAULT_EXAM_REVIEW_POLICY } from '../constants/exam-review-policy.constants';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { QuestionType } from '../../question-bank/enums/question-type.enum';
import { buildExamAttemptResultSnapshot } from './exam-attempt-result.util';

describe('exam-attempt-result.util', () => {
  const gradedStatus = ExamAttemptStatus.Graded;

  it('returns null when score visibility is not met', () => {
    const result = buildExamAttemptResultSnapshot({
      reviewPolicy: DEFAULT_EXAM_REVIEW_POLICY,
      attemptStatus: gradedStatus,
      assignmentClosed: false,
      correctCount: 8,
      scorePercent: '80.00',
      passed: true,
      autoSubmitReason: 'LEARNER_SUBMIT',
      questions: [],
      feedbackByQuestionVersionId: new Map(),
      gradeByQuestionVersionId: new Map(),
    });

    expect(result).toBeNull();
  });

  it('includes per-question review when visibility allows', () => {
    const questionVersionId = '11111111-1111-4111-8111-111111111111';
    const result = buildExamAttemptResultSnapshot({
      reviewPolicy: {
        scoreVisibility: 'AFTER_SUBMIT',
        correctAnswerVisibility: 'AFTER_SUBMIT',
        explanationVisibility: 'NEVER',
      },
      attemptStatus: gradedStatus,
      assignmentClosed: false,
      correctCount: 1,
      scorePercent: '100.00',
      passed: true,
      autoSubmitReason: 'LEARNER_SUBMIT',
      questions: [
        {
          examAttemptQuestionId: '22222222-2222-4222-8222-222222222222',
          sortOrder: 1,
          prompt: 'Prompt',
          questionType: QuestionType.SingleChoice,
          questionVersionId,
          selectedOptionIds: [questionVersionId],
        },
      ],
      feedbackByQuestionVersionId: new Map([
        [
          questionVersionId,
          {
            questionVersionId,
            explanation: 'Because.',
            explanationMediaJson: null,
            correctOptionIds: [questionVersionId],
          },
        ],
      ]),
      gradeByQuestionVersionId: new Map([
        [
          questionVersionId,
          {
            questionVersionId,
            questionType: QuestionType.SingleChoice,
            isCorrect: true,
            score: 1,
          },
        ],
      ]),
    });

    expect(result?.questions?.[0]?.correctOptionIds).toEqual([questionVersionId]);
    expect(result?.questions?.[0]?.explanation).toBeNull();
    expect(result?.questions?.[0]?.isCorrect).toBe(true);
  });
});
