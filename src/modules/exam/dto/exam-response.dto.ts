import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamStatus } from '../enums/exam-status.enum';

export class ExamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ example: 'midterm-2026' })
  code!: string;

  @ApiProperty({ enum: ExamStatus })
  status!: ExamStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  currentPublishedVersionId!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ExamListResponseDto {
  @ApiProperty({ type: [ExamResponseDto] })
  items!: ExamResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
