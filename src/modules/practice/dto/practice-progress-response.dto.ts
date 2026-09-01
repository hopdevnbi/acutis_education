import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ClassPracticeProgressLearnerRow,
  ClassPracticeProgressSnapshot,
  ClassPracticeProgressSummary,
  EnrollmentPracticeProgressSnapshot,
  PracticeProgressFilters,
  PracticeProgressReviewMetrics,
  PracticeProgressStandardMetrics,
} from '../interfaces/practice-progress.interface';

export class PracticeProgressFiltersDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  curriculumId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  canonicalLessonKey!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  from!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  to!: string | null;
}

export class PracticeProgressStandardMetricsDto {
  @ApiProperty()
  sessionsCompleted!: number;

  @ApiProperty()
  inProgressSessions!: number;

  @ApiProperty()
  abandonedSessions!: number;

  @ApiProperty()
  questionsAttempted!: number;

  @ApiProperty()
  firstAttemptCorrect!: number;

  @ApiProperty()
  finalCorrect!: number;

  @ApiProperty({ description: 'Ratio from 0 to 1. Returns 0 when denominator is 0.' })
  firstAttemptAccuracy!: number;

  @ApiProperty({ description: 'Ratio from 0 to 1. Returns 0 when denominator is 0.' })
  finalAccuracy!: number;
}

export class PracticeProgressReviewMetricsDto {
  @ApiProperty()
  sessionsCompleted!: number;

  @ApiProperty()
  questionsAttempted!: number;

  @ApiProperty()
  finalCorrect!: number;

  @ApiProperty({ description: 'Ratio from 0 to 1. Returns 0 when denominator is 0.' })
  finalAccuracy!: number;

  @ApiProperty()
  uniqueQuestionVersionsReviewed!: number;
}

export class EnrollmentPracticeProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ type: PracticeProgressFiltersDto })
  filters!: PracticeProgressFiltersDto;

  @ApiProperty({ type: PracticeProgressStandardMetricsDto })
  standard!: PracticeProgressStandardMetricsDto;

  @ApiProperty({ type: PracticeProgressReviewMetricsDto })
  review!: PracticeProgressReviewMetricsDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPracticedAt!: string | null;
}

export class ClassPracticeProgressLearnerRowDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  sessionsCompleted!: number;

  @ApiProperty()
  questionsAttempted!: number;

  @ApiProperty()
  firstAttemptAccuracy!: number;

  @ApiProperty()
  finalAccuracy!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPracticedAt!: string | null;
}

export class ClassPracticeProgressSummaryDto {
  @ApiProperty()
  learnersWithPractice!: number;

  @ApiProperty()
  sessionsCompleted!: number;

  @ApiProperty()
  questionsAttempted!: number;

  @ApiProperty()
  firstAttemptCorrect!: number;

  @ApiProperty()
  finalCorrect!: number;

  @ApiProperty()
  firstAttemptAccuracy!: number;

  @ApiProperty()
  finalAccuracy!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPracticedAt!: string | null;
}

export class ClassPracticeProgressLearnersPageDto {
  @ApiProperty({ type: [ClassPracticeProgressLearnerRowDto] })
  items!: ClassPracticeProgressLearnerRowDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ClassPracticeProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ type: PracticeProgressFiltersDto })
  filters!: PracticeProgressFiltersDto;

  @ApiProperty({ type: ClassPracticeProgressSummaryDto })
  summary!: ClassPracticeProgressSummaryDto;

  @ApiProperty({ type: ClassPracticeProgressLearnersPageDto })
  learners!: ClassPracticeProgressLearnersPageDto;
}

function toPracticeProgressFiltersDto(
  filters: PracticeProgressFilters,
): PracticeProgressFiltersDto {
  return {
    curriculumId: filters.curriculumId,
    canonicalLessonKey: filters.canonicalLessonKey,
    from: filters.from?.toISOString() ?? null,
    to: filters.to?.toISOString() ?? null,
  };
}

function toPracticeProgressStandardMetricsDto(
  metrics: PracticeProgressStandardMetrics,
): PracticeProgressStandardMetricsDto {
  return { ...metrics };
}

function toPracticeProgressReviewMetricsDto(
  metrics: PracticeProgressReviewMetrics,
): PracticeProgressReviewMetricsDto {
  return { ...metrics };
}

function toClassPracticeProgressSummaryDto(
  summary: ClassPracticeProgressSummary,
): ClassPracticeProgressSummaryDto {
  return {
    ...summary,
    lastPracticedAt: summary.lastPracticedAt?.toISOString() ?? null,
  };
}

function toClassPracticeProgressLearnerRowDto(
  row: ClassPracticeProgressLearnerRow,
): ClassPracticeProgressLearnerRowDto {
  return {
    ...row,
    lastPracticedAt: row.lastPracticedAt?.toISOString() ?? null,
  };
}

export function toEnrollmentPracticeProgressResponseDto(
  snapshot: EnrollmentPracticeProgressSnapshot,
): EnrollmentPracticeProgressResponseDto {
  return {
    enrollmentId: snapshot.enrollmentId,
    filters: toPracticeProgressFiltersDto(snapshot.filters),
    standard: toPracticeProgressStandardMetricsDto(snapshot.standard),
    review: toPracticeProgressReviewMetricsDto(snapshot.review),
    lastPracticedAt: snapshot.lastPracticedAt?.toISOString() ?? null,
  };
}

export function toClassPracticeProgressResponseDto(
  snapshot: ClassPracticeProgressSnapshot,
): ClassPracticeProgressResponseDto {
  return {
    classId: snapshot.classId,
    filters: toPracticeProgressFiltersDto(snapshot.filters),
    summary: toClassPracticeProgressSummaryDto(snapshot.summary),
    learners: {
      items: snapshot.learners.items.map(toClassPracticeProgressLearnerRowDto),
      page: snapshot.learners.page,
      limit: snapshot.learners.limit,
      total: snapshot.learners.total,
      totalPages: snapshot.learners.totalPages,
    },
  };
}
