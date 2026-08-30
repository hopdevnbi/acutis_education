import { Injectable } from '@nestjs/common';
import type { ClassParentReadScopePort } from '../../class/interfaces/class-parent-read-scope.port';
import type { ParishGuardianReadScopePort } from '../../parish/interfaces/parish-guardian-read-scope.port';
import { EnrollmentQueryService } from './enrollment-query.service';

@Injectable()
export class EnrollmentGuardianScopeService
  implements ParishGuardianReadScopePort, ClassParentReadScopePort
{
  constructor(private readonly enrollmentQueryService: EnrollmentQueryService) {}

  async canReadParishAsGuardian(rawUserId: string, rawParishId: string): Promise<boolean> {
    return this.enrollmentQueryService.hasGuardianLinkedStudentInParish(rawUserId, rawParishId);
  }

  async canReadClassAsGuardian(rawUserId: string, rawClassId: string): Promise<boolean> {
    return this.enrollmentQueryService.hasGuardianLinkedStudentInClass(rawUserId, rawClassId);
  }
}
