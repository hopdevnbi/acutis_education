import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';
import type {
  ClassLearningProgressLearnerRow,
  ClassLearningProgressSnapshot,
  ClassLearningProgressSummary,
  EnrollmentLearningProgressSnapshot,
  EnrollmentLessonStateSnapshot,
  LearningDimensionMetrics,
  LearningProgressExamSnapshot,
  LearningProgressFilters,
  LearningProgressPracticeSnapshot,
} from '../interfaces/learning-progress.interface';
import type { LessonProgressSnapshot } from '../interfaces/lesson-progress.interface';

export class LearningProgressFiltersDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  curriculumId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  canonicalLessonKey!: string | null;
}

export class LearningDimensionMetricsDto {
  @ApiProperty({ format: 'uuid' })
  curriculumId!: string;

  @ApiProperty({ format: 'uuid' })
  assignedCurriculumVersionId!: string;

  @ApiProperty()
  lessonsAssigned!: number;

  @ApiProperty()
  lessonsStarted!: number;

  @ApiProperty()
  lessonsCompleted!: number;

  @ApiProperty({ description: 'Ratio from 0 to 1. Returns 0 when denominator is 0.' })
  completionRatio!: number;
}

export class CompactLearningDimensionMetricsDto {
  @ApiProperty()
  lessonsAssigned!: number;

  @ApiProperty()
  lessonsStarted!: number;

  @ApiProperty()
  lessonsCompleted!: number;

  @ApiProperty({ description: 'Ratio from 0 to 1. Returns 0 when denominator is 0.' })
  completionRatio!: number;
}

export class EnrollmentLessonStateResponseDto {
  @ApiProperty({ format: 'uuid' })
  canonicalLessonKey!: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status!: LessonProgressStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt!: string | null;
}

export class LearningProgressPracticeStandardMetricsDto {
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
}

export class LearningProgressPracticeReviewMetricsDto {
  @ApiProperty()
  sessionsCompleted!: number;

  @ApiProperty()
  questionsAttempted!: number;

  @ApiProperty()
  finalCorrect!: number;

  @ApiProperty()
  finalAccuracy!: number;

  @ApiProperty()
  uniqueQuestionVersionsReviewed!: number;
}

export class LearningProgressExamResponseDto {
  @ApiProperty()
  assignmentsAvailable!: number;

  @ApiProperty()
  attemptsCompleted!: number;

  @ApiPropertyOptional({ nullable: true })
  latestScorePercent!: string | null;
}

export class LearningProgressPracticeResponseDto {
  @ApiProperty({ type: LearningProgressPracticeStandardMetricsDto })
  standard!: LearningProgressPracticeStandardMetricsDto;

  @ApiProperty({ type: LearningProgressPracticeReviewMetricsDto })
  review!: LearningProgressPracticeReviewMetricsDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPracticedAt!: string | null;
}

export class LessonProgressResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  id!: string | null;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  curriculumId!: string;

  @ApiProperty({ format: 'uuid' })
  canonicalLessonKey!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedCurriculumVersionId!: string | null;

  @ApiProperty({ enum: LessonProgressStatus })
  status!: LessonProgressStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt!: string | null;
}

export class EnrollmentLearningProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ type: LearningProgressFiltersDto })
  filters!: LearningProgressFiltersDto;

  @ApiProperty({ type: LearningDimensionMetricsDto })
  learning!: LearningDimensionMetricsDto;

  @ApiProperty({ type: [EnrollmentLessonStateResponseDto] })
  lessons!: EnrollmentLessonStateResponseDto[];

  @ApiProperty({ type: LearningProgressPracticeResponseDto })
  practice!: LearningProgressPracticeResponseDto;

  @ApiProperty({ type: LearningProgressExamResponseDto })
  exam!: LearningProgressExamResponseDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}

export class ClassLearningProgressLearnerRowDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ type: CompactLearningDimensionMetricsDto })
  learning!: CompactLearningDimensionMetricsDto;

  @ApiProperty({ type: LearningProgressPracticeResponseDto })
  practice!: LearningProgressPracticeResponseDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}

export class ClassLearningProgressSummaryDto {
  @ApiProperty()
  learnersTotal!: number;

  @ApiProperty()
  learnersWithLearningActivity!: number;

  @ApiProperty()
  lessonAssignmentsTotal!: number;

  @ApiProperty()
  lessonsStarted!: number;

  @ApiProperty()
  lessonsCompleted!: number;

  @ApiProperty()
  completionRatio!: number;

  @ApiProperty({ type: LearningProgressPracticeResponseDto })
  practice!: LearningProgressPracticeResponseDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}

export class ClassLearningProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ type: LearningProgressFiltersDto })
  filters!: LearningProgressFiltersDto;

  @ApiProperty({ type: ClassLearningProgressSummaryDto })
  summary!: ClassLearningProgressSummaryDto;

  @ApiProperty({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/ClassLearningProgressLearnerRowDto' },
      },
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
  })
  learners!: {
    items: ClassLearningProgressLearnerRowDto[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toIsoString(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

function toFiltersDto(filters: LearningProgressFilters): LearningProgressFiltersDto {
  return {
    curriculumId: filters.curriculumId,
    canonicalLessonKey: filters.canonicalLessonKey,
  };
}

function toExamDto(exam: LearningProgressExamSnapshot): LearningProgressExamResponseDto {
  return {
    assignmentsAvailable: exam.assignmentsAvailable,
    attemptsCompleted: exam.attemptsCompleted,
    latestScorePercent: exam.latestScorePercent,
  };
}

function toPracticeDto(
  practice: LearningProgressPracticeSnapshot,
): LearningProgressPracticeResponseDto {
  return {
    standard: { ...practice.standard },
    review: { ...practice.review },
    lastPracticedAt: toIsoString(practice.lastPracticedAt),
  };
}

function toLearningMetricsDto(learning: LearningDimensionMetrics): LearningDimensionMetricsDto {
  return { ...learning };
}

function toLessonStateDto(lesson: EnrollmentLessonStateSnapshot): EnrollmentLessonStateResponseDto {
  return {
    canonicalLessonKey: lesson.canonicalLessonKey,
    status: lesson.status,
    startedAt: toIsoString(lesson.startedAt),
    completedAt: toIsoString(lesson.completedAt),
  };
}

export function toLessonProgressResponseDto(
  snapshot: LessonProgressSnapshot,
): LessonProgressResponseDto {
  return {
    id: snapshot.id,
    enrollmentId: snapshot.enrollmentId,
    curriculumId: snapshot.curriculumId,
    canonicalLessonKey: snapshot.canonicalLessonKey,
    assignedCurriculumVersionId: snapshot.assignedCurriculumVersionId,
    status: snapshot.status,
    startedAt: toIsoString(snapshot.startedAt),
    completedAt: toIsoString(snapshot.completedAt),
  };
}

export function toEnrollmentLearningProgressResponseDto(
  snapshot: EnrollmentLearningProgressSnapshot,
): EnrollmentLearningProgressResponseDto {
  return {
    enrollmentId: snapshot.enrollmentId,
    filters: toFiltersDto(snapshot.filters),
    learning: toLearningMetricsDto(snapshot.learning),
    lessons: snapshot.lessons.map(toLessonStateDto),
    practice: toPracticeDto(snapshot.practice),
    exam: toExamDto(snapshot.exam),
    lastLearningActivityAt: toIsoString(snapshot.lastLearningActivityAt),
  };
}

function toClassLearnerRowDto(
  row: ClassLearningProgressLearnerRow,
): ClassLearningProgressLearnerRowDto {
  return {
    enrollmentId: row.enrollmentId,
    studentId: row.studentId,
    learning: { ...row.learning },
    practice: toPracticeDto(row.practice),
    lastLearningActivityAt: toIsoString(row.lastLearningActivityAt),
  };
}

function toClassSummaryDto(summary: ClassLearningProgressSummary): ClassLearningProgressSummaryDto {
  return {
    learnersTotal: summary.learnersTotal,
    learnersWithLearningActivity: summary.learnersWithLearningActivity,
    lessonAssignmentsTotal: summary.lessonAssignmentsTotal,
    lessonsStarted: summary.lessonsStarted,
    lessonsCompleted: summary.lessonsCompleted,
    completionRatio: summary.completionRatio,
    practice: toPracticeDto(summary.practice),
    lastLearningActivityAt: toIsoString(summary.lastLearningActivityAt),
  };
}

export function toClassLearningProgressResponseDto(
  snapshot: ClassLearningProgressSnapshot,
): ClassLearningProgressResponseDto {
  return {
    classId: snapshot.classId,
    filters: toFiltersDto(snapshot.filters),
    summary: toClassSummaryDto(snapshot.summary),
    learners: {
      items: snapshot.learners.items.map(toClassLearnerRowDto),
      page: snapshot.learners.page,
      limit: snapshot.learners.limit,
      total: snapshot.learners.total,
      totalPages: snapshot.learners.totalPages,
    },
  };
}
