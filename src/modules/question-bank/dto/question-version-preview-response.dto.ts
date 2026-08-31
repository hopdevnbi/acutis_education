import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';

export class QuestionVersionPreviewOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  text!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class QuestionVersionPreviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  questionVersionId!: string;

  @ApiProperty({ enum: QuestionType })
  questionType!: QuestionType;

  @ApiProperty()
  prompt!: string;

  @ApiPropertyOptional({ nullable: true })
  instruction!: string | null;

  @ApiPropertyOptional({ enum: QuestionDifficulty, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @ApiPropertyOptional({ nullable: true })
  promptMediaJson!: string | null;

  @ApiProperty({ type: [QuestionVersionPreviewOptionDto] })
  options!: QuestionVersionPreviewOptionDto[];
}
