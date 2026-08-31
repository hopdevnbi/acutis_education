import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';
import type { PracticeSessionSnapshot } from '../interfaces/practice.interface';
import { buildPracticeSessionQuestionMediaContentPath } from '../utils/practice-media-content-path.util';

export class PracticeSessionQuestionAttemptStateResponseDto {
  @ApiProperty()
  attemptCount!: number;

  @ApiProperty()
  canRetry!: boolean;

  @ApiProperty()
  finalized!: boolean;
}

export class PracticeSessionQuestionOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  text!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  deliveredPosition!: number;

  @ApiPropertyOptional({ nullable: true })
  mediaContentPath!: string | null;
}

export class PracticeSessionQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionQuestionId!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ format: 'uuid' })
  questionVersionId!: string;

  @ApiProperty()
  questionType!: string;

  @ApiProperty()
  prompt!: string;

  @ApiPropertyOptional({ nullable: true })
  instruction!: string | null;

  @ApiPropertyOptional({ nullable: true })
  difficulty!: string | null;

  @ApiPropertyOptional({ nullable: true })
  promptMediaJson!: string | null;

  @ApiProperty({ type: [PracticeSessionQuestionOptionResponseDto] })
  options!: PracticeSessionQuestionOptionResponseDto[];

  @ApiProperty({ type: PracticeSessionQuestionAttemptStateResponseDto })
  attemptState!: PracticeSessionQuestionAttemptStateResponseDto;
}

export class PracticeSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ enum: PracticeSessionType })
  sessionType!: PracticeSessionType;

  @ApiProperty({ enum: PracticeSessionStatus })
  status!: PracticeSessionStatus;

  @ApiProperty()
  locale!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  curriculumId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  canonicalLessonKey!: string | null;

  @ApiProperty()
  requestedQuestionCount!: number;

  @ApiProperty()
  maxAttemptsPerQuestion!: number;

  @ApiProperty()
  randomizeQuestions!: boolean;

  @ApiProperty()
  randomizeOptions!: boolean;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  abandonedAt!: string | null;

  @ApiProperty({ type: [PracticeSessionQuestionResponseDto] })
  questions!: PracticeSessionQuestionResponseDto[];
}

export function toPracticeSessionResponseDto(
  snapshot: PracticeSessionSnapshot,
): PracticeSessionResponseDto {
  return {
    id: snapshot.id,
    enrollmentId: snapshot.enrollmentId,
    sessionType: snapshot.sessionType,
    status: snapshot.status,
    locale: snapshot.locale,
    curriculumId: snapshot.curriculumId,
    canonicalLessonKey: snapshot.canonicalLessonKey,
    requestedQuestionCount: snapshot.requestedQuestionCount,
    maxAttemptsPerQuestion: snapshot.maxAttemptsPerQuestion,
    randomizeQuestions: snapshot.randomizeQuestions,
    randomizeOptions: snapshot.randomizeOptions,
    startedAt: snapshot.startedAt.toISOString(),
    completedAt: snapshot.completedAt?.toISOString() ?? null,
    abandonedAt: snapshot.abandonedAt?.toISOString() ?? null,
    questions: snapshot.questions.map((question) => ({
      sessionQuestionId: question.sessionQuestionId,
      position: question.position,
      questionVersionId: question.questionVersionId,
      questionType: question.questionType,
      prompt: question.prompt,
      instruction: question.instruction,
      difficulty: question.difficulty,
      promptMediaJson: question.promptMediaJson,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
        sortOrder: option.sortOrder,
        deliveredPosition: option.deliveredPosition,
        mediaContentPath:
          option.mediaAssetId === null
            ? null
            : buildPracticeSessionQuestionMediaContentPath(
                snapshot.id,
                question.sessionQuestionId,
                option.mediaAssetId,
              ),
      })),
      attemptState: {
        attemptCount: question.attemptState.attemptCount,
        canRetry: question.attemptState.canRetry,
        finalized: question.attemptState.finalized,
      },
    })),
  };
}
