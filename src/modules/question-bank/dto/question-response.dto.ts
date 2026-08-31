import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus } from '../enums/question-status.enum';

export class QuestionResponseDto {
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
}
