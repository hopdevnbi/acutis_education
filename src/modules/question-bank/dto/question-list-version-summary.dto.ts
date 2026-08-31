import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';

export class QuestionListVersionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ enum: QuestionType })
  questionType!: QuestionType;

  @ApiPropertyOptional({ enum: QuestionDifficulty, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @ApiProperty({ enum: QuestionVersionStatus })
  status!: QuestionVersionStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt?: string | null;
}
