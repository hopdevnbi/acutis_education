import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ExamVersionStatus } from '../enums/exam-version-status.enum';
import { ExamReviewPolicyResponseDto } from './exam-version-request.dto';

export class ExamVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  instructions!: string | null;

  @ApiProperty()
  sourceLocale!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiPropertyOptional({ nullable: true })
  passingScorePercent!: string | null;

  @ApiProperty()
  shuffleQuestions!: boolean;

  @ApiProperty()
  shuffleOptions!: boolean;

  @ApiProperty({ type: ExamReviewPolicyResponseDto })
  reviewPolicy!: ExamReviewPolicyResponseDto;

  @ApiProperty({ enum: ExamVersionStatus })
  status!: ExamVersionStatus;

  @ApiPropertyOptional({ nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publishedByUserId!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ExamVersionListResponseDto {
  @ApiProperty({ type: [ExamVersionResponseDto] })
  items!: ExamVersionResponseDto[];
}

export class ExamVersionListQueryDto {
  @ApiPropertyOptional({ enum: ExamVersionStatus })
  @IsOptional()
  @IsEnum(ExamVersionStatus)
  status?: ExamVersionStatus;
}
