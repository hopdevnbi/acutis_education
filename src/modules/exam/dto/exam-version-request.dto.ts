import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EXAM_REVIEW_VISIBILITY_VALUES } from '../constants/exam-review-policy.constants';

export class ExamReviewPolicyRequestDto {
  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  @IsString()
  @IsNotEmpty()
  scoreVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];

  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  @IsString()
  @IsNotEmpty()
  correctAnswerVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];

  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  @IsString()
  @IsNotEmpty()
  explanationVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];
}

export class ExamReviewPolicyResponseDto {
  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  scoreVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];

  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  correctAnswerVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];

  @ApiProperty({ enum: EXAM_REVIEW_VISIBILITY_VALUES })
  explanationVisibility!: (typeof EXAM_REVIEW_VISIBILITY_VALUES)[number];
}

export class CreateExamVersionRequestDto {
  @ApiProperty({ example: 'Midterm Exam 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string | null;

  @ApiProperty({ example: 'vi-VN' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  sourceLocale!: string;

  @ApiProperty({ minimum: 1, example: 45 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes!: number;

  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts!: number;

  @ApiPropertyOptional({ example: '70.00', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  passingScorePercent?: string | null;

  @ApiProperty({ default: false })
  @IsBoolean()
  shuffleQuestions!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  shuffleOptions!: boolean;

  @ApiPropertyOptional({ type: ExamReviewPolicyRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExamReviewPolicyRequestDto)
  reviewPolicy?: ExamReviewPolicyRequestDto;
}

export class UpdateExamVersionRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string | null;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  sourceLocale?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  passingScorePercent?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ type: ExamReviewPolicyRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExamReviewPolicyRequestDto)
  reviewPolicy?: ExamReviewPolicyRequestDto;
}
