import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { ParentPortalEnrollmentProgressSnapshot } from '../interfaces/parent-portal.interface';
import {
  FamilyPortalExamMetricsDto,
  FamilyPortalLearningMetricsDto,
  FamilyPortalPracticeMetricsDto,
  FamilyPortalProgressFiltersDto,
} from './family-portal-progress-response.dto';

export class ParentCompactProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ type: FamilyPortalProgressFiltersDto })
  filters!: FamilyPortalProgressFiltersDto;

  @ApiProperty({ type: FamilyPortalLearningMetricsDto })
  learning!: FamilyPortalLearningMetricsDto;

  @ApiProperty({ type: FamilyPortalPracticeMetricsDto })
  practice!: FamilyPortalPracticeMetricsDto;

  @ApiProperty({ type: FamilyPortalExamMetricsDto })
  exam!: FamilyPortalExamMetricsDto;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLearningActivityAt!: string | null;
}

export class ParentEnrollmentProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ type: ParentCompactProgressResponseDto })
  progress!: ParentCompactProgressResponseDto;
}

export function toParentEnrollmentProgressResponseDto(
  snapshot: ParentPortalEnrollmentProgressSnapshot,
): ParentEnrollmentProgressResponseDto {
  return {
    enrollmentId: snapshot.enrollmentId,
    studentId: snapshot.studentId,
    enrollmentStatus: snapshot.enrollmentStatus,
    progress: {
      enrollmentId: snapshot.progress.enrollmentId,
      filters: { ...snapshot.progress.filters },
      learning: { ...snapshot.progress.learning },
      practice: {
        standard: { ...snapshot.progress.practice.standard },
        review: { ...snapshot.progress.practice.review },
        lastPracticedAt: snapshot.progress.practice.lastPracticedAt?.toISOString() ?? null,
      },
      exam: { ...snapshot.progress.exam },
      lastLearningActivityAt: snapshot.progress.lastLearningActivityAt?.toISOString() ?? null,
    },
  };
}
