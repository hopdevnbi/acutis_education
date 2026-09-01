import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PracticeAnswerResult,
  PracticeSessionQuestionFeedback,
} from '../interfaces/practice.interface';

export class PracticeAnswerFeedbackResponseDto {
  @ApiPropertyOptional({ nullable: true })
  explanation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  explanationMediaJson!: string | null;

  @ApiProperty({ type: [String], format: 'uuid' })
  correctOptionIds!: string[];
}

export class PracticeAnswerResponseDto {
  @ApiProperty({ format: 'uuid' })
  attemptId!: string;

  @ApiProperty({ format: 'uuid' })
  clientAnswerId!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty()
  isCorrect!: boolean;

  @ApiProperty({ enum: [0, 1] })
  score!: 0 | 1;

  @ApiProperty()
  questionFinalized!: boolean;

  @ApiProperty()
  canRetry!: boolean;

  @ApiProperty()
  remainingAttempts!: number;

  @ApiProperty()
  sessionCompleted!: boolean;

  @ApiPropertyOptional({ type: PracticeAnswerFeedbackResponseDto, nullable: true })
  feedback!: PracticeAnswerFeedbackResponseDto | null;
}

function toPracticeAnswerFeedbackResponseDto(
  feedback: PracticeSessionQuestionFeedback,
): PracticeAnswerFeedbackResponseDto {
  return {
    explanation: feedback.explanation,
    explanationMediaJson: feedback.explanationMediaJson,
    correctOptionIds: [...feedback.correctOptionIds],
  };
}

export function toPracticeAnswerResponseDto(
  result: PracticeAnswerResult,
): PracticeAnswerResponseDto {
  return {
    attemptId: result.attemptId,
    clientAnswerId: result.clientAnswerId,
    attemptNumber: result.attemptNumber,
    isCorrect: result.isCorrect,
    score: result.score,
    questionFinalized: result.questionFinalized,
    canRetry: result.canRetry,
    remainingAttempts: result.remainingAttempts,
    sessionCompleted: result.sessionCompleted,
    feedback:
      result.feedback === null ? null : toPracticeAnswerFeedbackResponseDto(result.feedback),
  };
}
