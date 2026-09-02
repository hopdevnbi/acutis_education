import type { QuestionType } from '../../question-bank/enums/question-type.enum';
import type { LearnerTranslationReadStatus } from '../../localization/enums/learner-translation-read-status.enum';
import type { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import type { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';

export interface StartExamAttemptInput {
  readonly enrollmentId: string;
  readonly examAssignmentId: string;
  readonly actorUserId: string;
  readonly clientRequestId?: string;
  readonly locale?: string;
  readonly acceptLanguageHeader?: string | null;
}

export interface ExamAttemptSnapshot {
  readonly id: string;
  readonly examAssignmentId: string;
  readonly enrollmentId: string;
  readonly attemptNumber: number;
  readonly startedByUserId: string;
  readonly status: ExamAttemptStatus;
  readonly examId: string;
  readonly examVersionId: string;
  readonly studentId: string;
  readonly classId: string;
  readonly parishId: string;
  readonly examTitleDelivered: string;
  readonly instructionsDelivered: string | null;
  readonly deliveredLocale: string;
  readonly startedAt: Date;
  readonly deadlineAt: Date;
  readonly submittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly questionCount: number | null;
  readonly maxAttempts: number;
  readonly serverTime: Date;
}

export interface ExamAttemptAnswerSnapshot {
  readonly examAttemptQuestionId: string;
  readonly selectedOptionIds: readonly string[];
  readonly savedAt: Date;
}

export interface ExamAttemptQuestionDelivery {
  readonly examAttemptQuestionId: string;
  readonly sortOrder: number;
  readonly questionId: string;
  readonly questionVersionId: string;
  readonly questionType: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly promptMediaJson: string | null;
  readonly deliveredLocale: string;
  readonly translationRevisionId: string | null;
  readonly translationStatus: LearnerTranslationReadStatus;
  readonly isFallback: boolean;
  readonly options: readonly ExamAttemptQuestionOptionDelivery[];
}

export interface ExamAttemptQuestionOptionDelivery {
  readonly id: string;
  readonly text: string | null;
  readonly mediaAssetId: string | null;
  readonly sortOrder: number;
}

export interface SaveExamAnswerInput {
  readonly examAttemptId: string;
  readonly examAttemptQuestionId: string;
  readonly actorUserId: string;
  readonly clientAnswerId: string;
  readonly selectedOptionIds: readonly string[];
}

export interface ExamAttemptResultSnapshot {
  readonly correctCount: number | null;
  readonly scorePercent: string | null;
  readonly passed: boolean | null;
  readonly autoSubmitReason: string | null;
}

export interface ExamAttemptDeliverySnapshot extends ExamAttemptSnapshot {
  readonly questions: readonly ExamAttemptQuestionDelivery[];
  readonly answers: readonly ExamAttemptAnswerSnapshot[];
  readonly result: ExamAttemptResultSnapshot | null;
}

export interface LearnerExamAssignmentSnapshot {
  readonly id: string;
  readonly examVersionId: string;
  readonly examId: string;
  readonly classId: string;
  readonly opensAt: Date;
  readonly closesAt: Date;
  readonly status: ExamAssignmentStatus;
  readonly effectiveStatus: ExamAssignmentStatus;
  readonly examCode: string;
  readonly examTitle: string;
  readonly durationMinutes: number;
  readonly maxAttempts: number;
  readonly attemptsStarted: number;
  readonly attemptsRemaining: number;
  readonly hasInProgressAttempt: boolean;
  readonly inProgressAttemptId: string | null;
}

export interface ListLearnerExamAssignmentsResult {
  readonly items: readonly LearnerExamAssignmentSnapshot[];
}
