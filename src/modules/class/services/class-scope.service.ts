import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  CLASS_PARENT_READ_SCOPE_PORT,
  type ClassParentReadScopePort,
} from '../interfaces/class-parent-read-scope.port';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { ClassScopeAccessDeniedError } from '../errors/class-scope.errors';
import { ClassCatechistAssignmentService } from './class-catechist-assignment.service';
import { ClassService } from './class.service';

@Injectable()
export class ClassScopeService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly classService: ClassService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    @Optional()
    @Inject(CLASS_PARENT_READ_SCOPE_PORT)
    private readonly classParentReadScopePort: ClassParentReadScopePort | null,
  ) {}

  async canReadParishAsCatechist(rawUserId: string, rawParishId: string): Promise<boolean> {
    return this.classCatechistAssignmentService.hasActiveAssignmentInParish(rawUserId, rawParishId);
  }

  async assertCanManageClass(rawUserId: string, rawClassId: string): Promise<void> {
    const classSnapshot = await this.classService.getClassById(rawClassId);

    await this.parishScopeService.assertCanManageParish(rawUserId, classSnapshot.parishId);
  }

  async assertCanReadClass(rawUserId: string, rawClassId: string): Promise<void> {
    if (await this.canReadClass(rawUserId, rawClassId)) {
      return;
    }

    throw new ClassScopeAccessDeniedError();
  }

  async canReadClass(rawUserId: string, rawClassId: string): Promise<boolean> {
    const classSnapshot = await this.classService.getClassById(rawClassId);

    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    if (
      await this.parishScopeService.hasActiveParishMembership(rawUserId, classSnapshot.parishId)
    ) {
      return true;
    }

    try {
      await this.classCatechistAssignmentService.assertCatechistAssigned(rawUserId, rawClassId);

      return true;
    } catch {
      // Fall through to optional guardian enrollment scope port.
    }

    if (this.classParentReadScopePort === null) {
      return false;
    }

    return this.classParentReadScopePort.canReadClassAsGuardian(rawUserId, rawClassId);
  }
}
