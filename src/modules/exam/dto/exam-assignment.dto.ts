import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  EXAM_ASSIGNMENT_LIST_DEFAULT_LIMIT,
  EXAM_ASSIGNMENT_LIST_DEFAULT_PAGE,
  EXAM_ASSIGNMENT_LIST_MAX_LIMIT,
} from '../constants/exam-list.constants';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';

export class CreateExamAssignmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  examVersionId!: string;

  @ApiProperty({ example: '2026-09-15T08:00:00.000Z' })
  @IsDateString()
  opensAt!: string;

  @ApiProperty({ example: '2026-09-15T10:00:00.000Z' })
  @IsDateString()
  closesAt!: string;
}

export class UpdateExamAssignmentRequestDto {
  @ApiPropertyOptional({ example: '2026-09-15T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  opensAt?: string;

  @ApiPropertyOptional({ example: '2026-09-15T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @ApiPropertyOptional({ enum: ExamAssignmentStatus })
  @IsOptional()
  @IsEnum(ExamAssignmentStatus)
  status?: ExamAssignmentStatus;
}

export class ExamAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty()
  opensAt!: string;

  @ApiProperty()
  closesAt!: string;

  @ApiProperty({ enum: ExamAssignmentStatus })
  status!: ExamAssignmentStatus;

  @ApiProperty({ enum: ExamAssignmentStatus })
  effectiveStatus!: ExamAssignmentStatus;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ExamAssignmentListResponseDto {
  @ApiProperty({ type: [ExamAssignmentResponseDto] })
  items!: ExamAssignmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ExamAssignmentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: EXAM_ASSIGNMENT_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = EXAM_ASSIGNMENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: EXAM_ASSIGNMENT_LIST_MAX_LIMIT,
    default: EXAM_ASSIGNMENT_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EXAM_ASSIGNMENT_LIST_MAX_LIMIT)
  limit: number = EXAM_ASSIGNMENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ExamAssignmentStatus })
  @IsOptional()
  @IsEnum(ExamAssignmentStatus)
  status?: ExamAssignmentStatus;
}
