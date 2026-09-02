import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { LearnerSelfScopeDeniedError } from '../errors/student-access.errors';
import { StudentService } from './student.service';

@Injectable()
export class LearnerSelfScopeService {
  constructor(private readonly studentService: StudentService) {}

  async isActingAsLinkedStudent(rawUserId: string, rawStudentId: string): Promise<boolean> {
    const studentSnapshot = await this.studentService.getStudentById(rawStudentId);

    return (
      studentSnapshot.userId !== null &&
      normalizeUuid(studentSnapshot.userId) === normalizeUuid(rawUserId)
    );
  }

  async assertActingAsLinkedStudent(rawUserId: string, rawStudentId: string): Promise<void> {
    if (await this.isActingAsLinkedStudent(rawUserId, rawStudentId)) {
      return;
    }

    throw new LearnerSelfScopeDeniedError();
  }
}
