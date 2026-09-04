import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FamilyPortalProgressFiltersDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  curriculumId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  canonicalLessonKey!: string | null;
}

export class FamilyPortalCompactLearningMetricsDto {
  @ApiProperty()
  lessonsAssigned!: number;

  @ApiProperty()
  lessonsStarted!: number;

  @ApiProperty()
  lessonsCompleted!: number;

  @ApiProperty()
  completionRatio!: number;
}

export class FamilyPortalLearningMetricsDto extends FamilyPortalCompactLearningMetricsDto {
  @ApiProperty({ format: 'uuid' })
  curriculumId!: string;

  @ApiProperty({ format: 'uuid' })
  assignedCurriculumVersionId!: string;
}

export class FamilyPortalPracticeStandardMetricsDto {
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

export class FamilyPortalPracticeReviewMetricsDto {
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

export class FamilyPortalPracticeMetricsDto {
  @ApiProperty({ type: FamilyPortalPracticeStandardMetricsDto })
  standard!: FamilyPortalPracticeStandardMetricsDto;

  @ApiProperty({ type: FamilyPortalPracticeReviewMetricsDto })
  review!: FamilyPortalPracticeReviewMetricsDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPracticedAt!: string | null;
}

export class FamilyPortalExamMetricsDto {
  @ApiProperty()
  assignmentsAvailable!: number;

  @ApiProperty()
  attemptsCompleted!: number;

  @ApiPropertyOptional({ nullable: true, example: '85.00' })
  latestScorePercent!: string | null;
}

export class FamilyPortalClassProgressSummaryDto {
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

  @ApiProperty({ type: FamilyPortalPracticeMetricsDto })
  practice!: FamilyPortalPracticeMetricsDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}
