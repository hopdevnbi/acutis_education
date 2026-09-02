import type { LearnerContextSnapshot } from '../interfaces/learner-context.interface';
import type { LearnerContextResponseDto } from '../dto/learner-context-response.dto';
import { toEnrollmentResponseDto } from './enrollment-response.mapper';

export function toLearnerContextResponseDto(
  snapshot: LearnerContextSnapshot,
): LearnerContextResponseDto {
  return {
    linkedStudents: snapshot.linkedStudents.map((linkedStudent) => ({
      studentId: linkedStudent.studentId,
      fullName: linkedStudent.fullName,
      activeEnrollments: linkedStudent.activeEnrollments.map(toEnrollmentResponseDto),
    })),
  };
}
