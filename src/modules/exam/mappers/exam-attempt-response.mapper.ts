import type {
  ExamAttemptDeliverySnapshot,
  ExamAttemptResultReadSnapshot,
  ListExamAssignmentAttemptSummariesResult,
  ListLearnerExamAssignmentsResult,
} from '../interfaces/exam-attempt.interface';
import type {
  ExamAttemptResponseDto,
  ExamAttemptResultReadResponseDto,
  ExamAttemptResultResponseDto,
  ExamAssignmentAttemptSummaryListResponseDto,
  LearnerExamAssignmentListResponseDto,
  LearnerExamAssignmentResponseDto,
} from '../dto/exam-attempt.dto';

function toExamAttemptResultResponseDto(
  result: ExamAttemptDeliverySnapshot['result'],
): ExamAttemptResultResponseDto | null {
  if (result === null) {
    return null;
  }

  return {
    correctCount: result.correctCount,
    scorePercent: result.scorePercent,
    passed: result.passed,
    autoSubmitReason: result.autoSubmitReason,
    questions:
      result.questions === null
        ? null
        : result.questions.map((question) => ({
            examAttemptQuestionId: question.examAttemptQuestionId,
            sortOrder: question.sortOrder,
            prompt: question.prompt,
            questionType: question.questionType,
            selectedOptionIds: [...question.selectedOptionIds],
            isCorrect: question.isCorrect,
            correctOptionIds:
              question.correctOptionIds === null ? null : [...question.correctOptionIds],
            explanation: question.explanation,
            explanationMediaJson: question.explanationMediaJson,
          })),
  };
}

export function toExamAttemptResponseDto(
  snapshot: ExamAttemptDeliverySnapshot,
): ExamAttemptResponseDto {
  return {
    id: snapshot.id,
    examAssignmentId: snapshot.examAssignmentId,
    enrollmentId: snapshot.enrollmentId,
    attemptNumber: snapshot.attemptNumber,
    status: snapshot.status,
    examId: snapshot.examId,
    examVersionId: snapshot.examVersionId,
    examTitleDelivered: snapshot.examTitleDelivered,
    instructionsDelivered: snapshot.instructionsDelivered,
    deliveredLocale: snapshot.deliveredLocale,
    startedAt: snapshot.startedAt.toISOString(),
    deadlineAt: snapshot.deadlineAt.toISOString(),
    serverTime: snapshot.serverTime.toISOString(),
    submittedAt: snapshot.submittedAt?.toISOString() ?? null,
    gradedAt: snapshot.gradedAt?.toISOString() ?? null,
    questionCount: snapshot.questionCount,
    maxAttempts: snapshot.maxAttempts,
    questions: snapshot.questions.map((question) => ({
      examAttemptQuestionId: question.examAttemptQuestionId,
      sortOrder: question.sortOrder,
      questionId: question.questionId,
      questionVersionId: question.questionVersionId,
      questionType: question.questionType,
      prompt: question.prompt,
      instruction: question.instruction,
      promptMediaJson: question.promptMediaJson,
      deliveredLocale: question.deliveredLocale,
      translationRevisionId: question.translationRevisionId,
      translationStatus: question.translationStatus,
      isFallback: question.isFallback,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
        sortOrder: option.sortOrder,
      })),
    })),
    answers: snapshot.answers.map((answer) => ({
      examAttemptQuestionId: answer.examAttemptQuestionId,
      selectedOptionIds: [...answer.selectedOptionIds],
      savedAt: answer.savedAt.toISOString(),
    })),
    result: toExamAttemptResultResponseDto(snapshot.result),
  };
}

export function toExamAttemptResultReadResponseDto(
  snapshot: ExamAttemptResultReadSnapshot,
): ExamAttemptResultReadResponseDto {
  return {
    id: snapshot.id,
    examAssignmentId: snapshot.examAssignmentId,
    enrollmentId: snapshot.enrollmentId,
    attemptNumber: snapshot.attemptNumber,
    status: snapshot.status,
    examId: snapshot.examId,
    examVersionId: snapshot.examVersionId,
    examTitleDelivered: snapshot.examTitleDelivered,
    deliveredLocale: snapshot.deliveredLocale,
    startedAt: snapshot.startedAt.toISOString(),
    submittedAt: snapshot.submittedAt?.toISOString() ?? null,
    gradedAt: snapshot.gradedAt?.toISOString() ?? null,
    questionCount: snapshot.questionCount,
    result: toExamAttemptResultResponseDto(snapshot.result),
  };
}

export function toExamAssignmentAttemptSummaryListResponseDto(
  result: ListExamAssignmentAttemptSummariesResult,
): ExamAssignmentAttemptSummaryListResponseDto {
  return {
    examAssignmentId: result.examAssignmentId,
    items: result.items.map((item) => ({
      attemptId: item.attemptId,
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      attemptNumber: item.attemptNumber,
      status: item.status,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      gradedAt: item.gradedAt?.toISOString() ?? null,
      scorePercent: item.scorePercent,
      passed: item.passed,
    })),
  };
}

export function toLearnerExamAssignmentResponseDto(
  snapshot: ListLearnerExamAssignmentsResult['items'][number],
): LearnerExamAssignmentResponseDto {
  return {
    id: snapshot.id,
    examVersionId: snapshot.examVersionId,
    examId: snapshot.examId,
    examCode: snapshot.examCode,
    examTitle: snapshot.examTitle,
    opensAt: snapshot.opensAt.toISOString(),
    closesAt: snapshot.closesAt.toISOString(),
    effectiveStatus: snapshot.effectiveStatus,
    durationMinutes: snapshot.durationMinutes,
    maxAttempts: snapshot.maxAttempts,
    attemptsStarted: snapshot.attemptsStarted,
    attemptsRemaining: snapshot.attemptsRemaining,
    hasInProgressAttempt: snapshot.hasInProgressAttempt,
    inProgressAttemptId: snapshot.inProgressAttemptId,
  };
}

export function toLearnerExamAssignmentListResponseDto(
  result: ListLearnerExamAssignmentsResult,
): LearnerExamAssignmentListResponseDto {
  return {
    items: result.items.map(toLearnerExamAssignmentResponseDto),
  };
}
