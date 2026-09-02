import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StartExamAttemptRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  examAssignmentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;
}

export class ExamAttemptQuestionOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  text!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class ExamAttemptQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  examAttemptQuestionId!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  questionVersionId!: string;

  @ApiProperty()
  questionType!: string;

  @ApiProperty()
  prompt!: string;

  @ApiPropertyOptional({ nullable: true })
  instruction!: string | null;

  @ApiPropertyOptional({ nullable: true })
  promptMediaJson!: string | null;

  @ApiProperty()
  deliveredLocale!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  translationRevisionId!: string | null;

  @ApiProperty()
  translationStatus!: string;

  @ApiProperty()
  isFallback!: boolean;

  @ApiProperty({ type: [ExamAttemptQuestionOptionResponseDto] })
  options!: ExamAttemptQuestionOptionResponseDto[];
}

export class ExamAttemptAnswerResponseDto {
  @ApiProperty({ format: 'uuid' })
  examAttemptQuestionId!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  selectedOptionIds!: string[];

  @ApiProperty()
  savedAt!: string;
}

export class SaveExamAnswerRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  clientAnswerId!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  selectedOptionIds!: string[];
}

export class ExamAttemptQuestionReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  examAttemptQuestionId!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  prompt!: string;

  @ApiProperty()
  questionType!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  selectedOptionIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  isCorrect!: boolean | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', nullable: true })
  correctOptionIds!: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  explanation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  explanationMediaJson!: string | null;
}

export class ExamAttemptResultResponseDto {
  @ApiPropertyOptional({ nullable: true })
  correctCount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scorePercent!: string | null;

  @ApiPropertyOptional({ nullable: true })
  passed!: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  autoSubmitReason!: string | null;

  @ApiPropertyOptional({ type: [ExamAttemptQuestionReviewResponseDto], nullable: true })
  questions!: ExamAttemptQuestionReviewResponseDto[] | null;
}

export class ExamAttemptResultReadResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examAssignmentId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty({ format: 'uuid' })
  examVersionId!: string;

  @ApiProperty()
  examTitleDelivered!: string;

  @ApiProperty()
  deliveredLocale!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  gradedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  questionCount!: number | null;

  @ApiPropertyOptional({ type: ExamAttemptResultResponseDto, nullable: true })
  result!: ExamAttemptResultResponseDto | null;
}

export class ExamAssignmentAttemptSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  attemptId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  gradedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  scorePercent!: string | null;

  @ApiPropertyOptional({ nullable: true })
  passed!: boolean | null;
}

export class ExamAssignmentAttemptSummaryListResponseDto {
  @ApiProperty({ format: 'uuid' })
  examAssignmentId!: string;

  @ApiProperty({ type: [ExamAssignmentAttemptSummaryResponseDto] })
  items!: ExamAssignmentAttemptSummaryResponseDto[];
}

export class ExamAttemptResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examAssignmentId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty({ format: 'uuid' })
  examVersionId!: string;

  @ApiProperty()
  examTitleDelivered!: string;

  @ApiPropertyOptional({ nullable: true })
  instructionsDelivered!: string | null;

  @ApiProperty()
  deliveredLocale!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  deadlineAt!: string;

  @ApiProperty()
  serverTime!: string;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  gradedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  questionCount!: number | null;

  @ApiProperty()
  maxAttempts!: number;

  @ApiProperty({ type: [ExamAttemptQuestionResponseDto] })
  questions!: ExamAttemptQuestionResponseDto[];

  @ApiProperty({ type: [ExamAttemptAnswerResponseDto] })
  answers!: ExamAttemptAnswerResponseDto[];

  @ApiPropertyOptional({ type: ExamAttemptResultResponseDto, nullable: true })
  result!: ExamAttemptResultResponseDto | null;
}

export class LearnerExamAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty()
  examCode!: string;

  @ApiProperty()
  examTitle!: string;

  @ApiProperty()
  opensAt!: string;

  @ApiProperty()
  closesAt!: string;

  @ApiProperty()
  effectiveStatus!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiProperty()
  attemptsStarted!: number;

  @ApiProperty()
  attemptsRemaining!: number;

  @ApiProperty()
  hasInProgressAttempt!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  inProgressAttemptId!: string | null;
}

export class LearnerExamAssignmentListResponseDto {
  @ApiProperty({ type: [LearnerExamAssignmentResponseDto] })
  items!: LearnerExamAssignmentResponseDto[];
}
