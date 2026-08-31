import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionListVersionSummaryDto } from './question-list-version-summary.dto';

export class QuestionListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty({ enum: QuestionStatus })
  status!: QuestionStatus;

  @ApiProperty({ example: 'vi-VN' })
  sourceLocale!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  currentPublishedVersionId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: QuestionListVersionSummaryDto, nullable: true })
  currentDraftVersion!: QuestionListVersionSummaryDto | null;

  @ApiPropertyOptional({ type: QuestionListVersionSummaryDto, nullable: true })
  currentPublishedVersion!: QuestionListVersionSummaryDto | null;

  @ApiProperty()
  hasDraft!: boolean;

  @ApiProperty()
  hasPublished!: boolean;
}
