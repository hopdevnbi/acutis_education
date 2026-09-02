import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import {
  EnrollmentLearningProgressResponseDto,
  toEnrollmentLearningProgressResponseDto,
} from '../../learning-progress/dto/learning-progress-response.dto';
import type { ParentPortalEnrollmentProgressSnapshot } from '../interfaces/parent-portal.interface';

export class ParentEnrollmentProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ type: EnrollmentLearningProgressResponseDto })
  progress!: EnrollmentLearningProgressResponseDto;
}

export function toParentEnrollmentProgressResponseDto(
  snapshot: ParentPortalEnrollmentProgressSnapshot,
): ParentEnrollmentProgressResponseDto {
  return {
    enrollmentId: snapshot.enrollmentId,
    studentId: snapshot.studentId,
    enrollmentStatus: snapshot.enrollmentStatus,
    progress: toEnrollmentLearningProgressResponseDto(snapshot.progress),
  };
}
