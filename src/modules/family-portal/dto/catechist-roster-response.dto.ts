import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentExamSummarySnapshot } from '../../exam/interfaces/exam.interface';
import type {
  CatechistPortalClassRosterSnapshot,
  CatechistPortalRosterLearnerSnapshot,
} from '../interfaces/catechist-portal.interface';
import type {
  ClassLearningProgressSummary,
  LearningProgressFilters,
  LearningProgressPracticeSnapshot,
} from '../../learning-progress/interfaces/learning-progress.interface';
import {
  FamilyPortalClassProgressSummaryDto,
  FamilyPortalCompactLearningMetricsDto,
  FamilyPortalExamMetricsDto,
  FamilyPortalPracticeMetricsDto,
  FamilyPortalProgressFiltersDto,
} from './family-portal-progress-response.dto';

export class CatechistRosterLearnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ type: FamilyPortalCompactLearningMetricsDto })
  learning!: FamilyPortalCompactLearningMetricsDto;

  @ApiProperty({ type: FamilyPortalPracticeMetricsDto })
  practice!: FamilyPortalPracticeMetricsDto;

  @ApiProperty({ type: FamilyPortalExamMetricsDto })
  exam!: FamilyPortalExamMetricsDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}

export class CatechistClassRosterResponseDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ type: FamilyPortalProgressFiltersDto })
  filters!: FamilyPortalProgressFiltersDto;

  @ApiProperty({ type: FamilyPortalClassProgressSummaryDto })
  summary!: FamilyPortalClassProgressSummaryDto;

  @ApiProperty({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/CatechistRosterLearnerResponseDto' },
      },
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
  })
  learners!: {
    items: CatechistRosterLearnerResponseDto[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toIsoString(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

function toFiltersDto(filters: LearningProgressFilters): FamilyPortalProgressFiltersDto {
  return {
    curriculumId: filters.curriculumId,
    canonicalLessonKey: filters.canonicalLessonKey,
  };
}

function toExamDto(exam: EnrollmentExamSummarySnapshot): FamilyPortalExamMetricsDto {
  return {
    assignmentsAvailable: exam.assignmentsAvailable,
    attemptsCompleted: exam.attemptsCompleted,
    latestScorePercent: exam.latestScorePercent,
  };
}

function toPracticeDto(practice: LearningProgressPracticeSnapshot): FamilyPortalPracticeMetricsDto {
  return {
    standard: { ...practice.standard },
    review: { ...practice.review },
    lastPracticedAt: toIsoString(practice.lastPracticedAt),
  };
}

function toClassSummaryDto(
  summary: ClassLearningProgressSummary,
): FamilyPortalClassProgressSummaryDto {
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

function toRosterLearnerDto(
  learner: CatechistPortalRosterLearnerSnapshot,
): CatechistRosterLearnerResponseDto {
  return {
    studentId: learner.studentId,
    enrollmentId: learner.enrollmentId,
    displayName: learner.displayName,
    enrollmentStatus: learner.enrollmentStatus,
    learning: { ...learner.learning },
    practice: toPracticeDto(learner.practice),
    exam: toExamDto(learner.exam),
    lastLearningActivityAt: toIsoString(learner.lastLearningActivityAt),
  };
}

export function toCatechistClassRosterResponseDto(
  snapshot: CatechistPortalClassRosterSnapshot,
): CatechistClassRosterResponseDto {
  return {
    classId: snapshot.classId,
    filters: toFiltersDto(snapshot.filters),
    summary: toClassSummaryDto(snapshot.summary),
    learners: {
      items: snapshot.learners.items.map(toRosterLearnerDto),
      page: snapshot.learners.page,
      limit: snapshot.learners.limit,
      total: snapshot.learners.total,
      totalPages: snapshot.learners.totalPages,
    },
  };
}
