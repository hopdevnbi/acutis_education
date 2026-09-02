import { Injectable } from '@nestjs/common';
import { StudentService } from '../../student/services/student.service';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import type { LearnerContextSnapshot } from '../interfaces/learner-context.interface';
import { EnrollmentService } from './enrollment.service';

@Injectable()
export class LearnerContextService {
  constructor(
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async getLearnerContextForUser(rawUserId: string): Promise<LearnerContextSnapshot> {
    const studentIds = await this.studentService.listStudentIdsByLinkedUserId(rawUserId);
    const linkedStudents = await Promise.all(
      studentIds.map(async (studentId) => {
        const student = await this.studentService.getStudentById(studentId);
        const enrollments = await this.enrollmentService.listEnrollmentsByStudent(studentId, {
          page: 1,
          limit: 50,
          sortBy: 'enrolledAt',
          sort: 'DESC',
          status: EnrollmentStatus.Active,
        });

        return {
          studentId: student.id,
          fullName: student.fullName,
          activeEnrollments: enrollments.items,
        };
      }),
    );

    return { linkedStudents };
  }
}
