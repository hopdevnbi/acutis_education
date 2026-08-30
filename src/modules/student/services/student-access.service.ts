import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  StudentAccessDeniedError,
  StudentManageAccessDeniedError,
} from '../errors/student-access.errors';
import { StudentGuardianService } from './student-guardian.service';
import { StudentService } from './student.service';

@Injectable()
export class StudentAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
  ) {}

  async assertCanCreateStudent(rawUserId: string): Promise<void> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.parishScopeService.hasAnyActiveParishMembership(rawUserId)) {
      return;
    }

    throw new StudentManageAccessDeniedError();
  }

  async canReadStudentByStudentEvidence(rawUserId: string, rawStudentId: string): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    const studentSnapshot = await this.studentService.getStudentById(rawStudentId);

    if (
      studentSnapshot.userId !== null &&
      normalizeUuid(studentSnapshot.userId) === normalizeUuid(rawUserId)
    ) {
      return true;
    }

    try {
      await this.studentGuardianService.assertGuardianLinked(rawUserId, rawStudentId);

      return true;
    } catch {
      return false;
    }
  }

  async assertCanReadStudentByStudentEvidence(
    rawUserId: string,
    rawStudentId: string,
  ): Promise<void> {
    if (await this.canReadStudentByStudentEvidence(rawUserId, rawStudentId)) {
      return;
    }

    throw new StudentAccessDeniedError();
  }
}
