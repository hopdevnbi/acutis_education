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

export interface PracticeSessionQuestionAttemptState {
  readonly attemptCount: number;
  readonly canRetry: boolean;
  readonly finalized: boolean;
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
