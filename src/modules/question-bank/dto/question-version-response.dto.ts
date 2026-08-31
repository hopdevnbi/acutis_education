import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';

export class QuestionVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ enum: QuestionVersionStatus })
  status!: QuestionVersionStatus;

  @ApiProperty({ enum: QuestionType })
  questionType!: QuestionType;

  @ApiProperty()
  prompt!: string;

  @ApiPropertyOptional({ nullable: true })
  instruction!: string | null;

  @ApiPropertyOptional({ nullable: true })
  explanation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  promptMediaJson!: string | null;

  @ApiPropertyOptional({ nullable: true })
  explanationMediaJson!: string | null;

  @ApiPropertyOptional({ nullable: true })
  answerDefinitionJson!: string | null;

  @ApiPropertyOptional({ enum: QuestionDifficulty, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @ApiPropertyOptional({ nullable: true })
  sourceContentHash!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publishedByUserId!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
