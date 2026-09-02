import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentResponseDto } from './enrollment-response.dto';

export class LinkedStudentLearnerContextResponseDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ example: 'Demo Student Alpha' })
  fullName!: string;

  @ApiProperty({ type: [EnrollmentResponseDto] })
  activeEnrollments!: EnrollmentResponseDto[];
}

export class LearnerContextResponseDto {
  @ApiProperty({ type: [LinkedStudentLearnerContextResponseDto] })
  linkedStudents!: LinkedStudentLearnerContextResponseDto[];
}
