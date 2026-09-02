import { Injectable } from '@nestjs/common';
import {
  CATECHIST_ROLE_CODE,
  PARENT_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { ActorNotCatechistError, ActorNotParentError } from '../errors/family-portal.errors';

@Injectable()
export class FamilyPortalAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly studentGuardianService: StudentGuardianService,
  ) {}

  async assertCatechistActor(rawActorUserId: string): Promise<void> {
    const roles = await this.accessControlService.getRolesForUser(rawActorUserId);
    const isCatechist = roles.some((role) => role.code === CATECHIST_ROLE_CODE);

    if (!isCatechist) {
      throw new ActorNotCatechistError();
    }
  }

  async assertParentActor(rawActorUserId: string): Promise<void> {
    const roles = await this.accessControlService.getRolesForUser(rawActorUserId);
    const isParent = roles.some((role) => role.code === PARENT_ROLE_CODE);

    if (!isParent) {
      throw new ActorNotParentError();
    }
  }

  async assertCatechistAssignedToClass(rawActorUserId: string, rawClassId: string): Promise<void> {
    await this.assertCatechistActor(rawActorUserId);
    await this.classCatechistAssignmentService.assertCatechistAssigned(rawActorUserId, rawClassId);
  }

  async assertGuardianLinkedToStudent(rawActorUserId: string, rawStudentId: string): Promise<void> {
    await this.assertParentActor(rawActorUserId);
    await this.studentGuardianService.assertGuardianLinked(rawActorUserId, rawStudentId);
  }
}
