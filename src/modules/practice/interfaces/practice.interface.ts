import type { QuestionDifficulty } from '../../question-bank/enums/question-difficulty.enum';
import type { QuestionType } from '../../question-bank/enums/question-type.enum';
import type { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import type { PracticeSessionType } from '../enums/practice-session-type.enum';

export interface CreatePracticeSessionInput {
  readonly enrollmentId: string;
  readonly actorUserId: string;
  readonly clientRequestId?: string;
  readonly locale?: string;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
  readonly tagIds?: readonly string[];
  readonly tagCodes?: readonly string[];
  readonly questionTypes?: readonly QuestionType[];
  readonly difficulty?: QuestionDifficulty;
  readonly questionCount?: number;
  readonly randomizeQuestions?: boolean;
  readonly randomizeOptions?: boolean;
}

export interface CreateReviewWrongSessionInput {
  readonly sourceSessionId: string;
  readonly actorUserId: string;
  readonly clientRequestId: string;
}

export interface ReviewWrongSessionResult {
  readonly snapshot: PracticeSessionSnapshot;
  readonly replayed: boolean;
}

export interface SubmitPracticeAnswerInput {
  readonly actorUserId: string;
  readonly sessionId: string;
  readonly sessionQuestionId: string;
  readonly clientAnswerId: string;
  readonly selectedOptionIds: readonly string[];
}

export interface PracticeSessionQuestionLatestAttempt {
  readonly attemptId: string;
  readonly attemptNumber: number;
  readonly clientAnswerId: string;
  readonly selectedOptionIds: readonly string[];
  readonly isCorrect: boolean;
  readonly score: number;
  readonly submittedAt: Date;
}

export interface PracticeSessionQuestionFeedback {
  readonly explanation: string | null;
  readonly explanationMediaJson: string | null;
  readonly correctOptionIds: readonly string[];
}

export interface PracticeSessionQuestionAttemptState {
  readonly attemptCount: number;
  readonly canRetry: boolean;
  readonly finalized: boolean;
  readonly remainingAttempts: number;
  readonly feedbackRevealed: boolean;
  readonly latestAttempt: PracticeSessionQuestionLatestAttempt | null;
  readonly feedback: PracticeSessionQuestionFeedback | null;
}

export interface PracticeSessionQuestionDelivery {
  readonly sessionQuestionId: string;
  readonly position: number;
  readonly questionVersionId: string;
  readonly questionType: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly difficulty: QuestionDifficulty | null;
  readonly promptMediaJson: string | null;
  readonly options: readonly {
    readonly id: string;
    readonly text: string | null;
    readonly mediaAssetId: string | null;
    readonly sortOrder: number;
    readonly deliveredPosition: number;
  }[];
  readonly attemptState: PracticeSessionQuestionAttemptState;
}

export interface PracticeSessionSummary {
  readonly totalQuestions: number;
  readonly answeredQuestionCount: number;
  readonly finalizedQuestionCount: number;
  readonly finalCorrectCount: number;
  readonly sessionCompleted: boolean;
}

export interface PracticeSessionSnapshot {
  readonly id: string;
  readonly enrollmentId: string;
  readonly sessionType: PracticeSessionType;
  readonly status: PracticeSessionStatus;
  readonly locale: string;
  readonly curriculumId: string | null;
  readonly canonicalLessonKey: string | null;
  readonly requestedQuestionCount: number;
  readonly maxAttemptsPerQuestion: number;
  readonly randomizeQuestions: boolean;
  readonly randomizeOptions: boolean;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly abandonedAt: Date | null;
  readonly questions: readonly PracticeSessionQuestionDelivery[];
  readonly summary: PracticeSessionSummary;
}

export interface PracticeAnswerResult {
  readonly attemptId: string;
  readonly clientAnswerId: string;
  readonly attemptNumber: number;
  readonly isCorrect: boolean;
  readonly score: 0 | 1;
  readonly questionFinalized: boolean;
  readonly canRetry: boolean;
  readonly remainingAttempts: number;
  readonly sessionCompleted: boolean;
  readonly feedback: PracticeSessionQuestionFeedback | null;
  readonly replayed: boolean;
}

export interface NormalizedPracticeGenerationRequest {
  readonly locale: string;
  readonly curriculumId: string | null;
  readonly canonicalLessonKey: string | null;
  readonly tagIds: readonly string[];
  readonly tagCodes: readonly string[];
  readonly questionTypes: readonly QuestionType[];
  readonly difficulty: QuestionDifficulty | null;
  readonly questionCount: number;
  readonly randomizeQuestions: boolean;
  readonly randomizeOptions: boolean;
}
