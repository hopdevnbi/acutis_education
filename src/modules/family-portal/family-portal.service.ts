import { Injectable } from '@nestjs/common';
import type {
  CatechistPortalClassListSnapshot,
  CatechistPortalClassRosterSnapshot,
  CatechistPortalContextSnapshot,
  GetCatechistClassRosterInput,
  ListCatechistClassesInput,
} from './interfaces/catechist-portal.interface';
import type {
  GetParentEnrollmentProgressInput,
  ParentPortalChildrenSnapshot,
  ParentPortalContextSnapshot,
  ParentPortalEnrollmentProgressSnapshot,
} from './interfaces/parent-portal.interface';
import { CatechistPortalService } from './services/catechist-portal.service';
import { ParentPortalService } from './services/parent-portal.service';

@Injectable()
export class FamilyPortalService {
  constructor(
    private readonly catechistPortalService: CatechistPortalService,
    private readonly parentPortalService: ParentPortalService,
  ) {}

  getCatechistContext(rawActorUserId: string): Promise<CatechistPortalContextSnapshot> {
    return this.catechistPortalService.getContext(rawActorUserId);
  }

  listCatechistClasses(
    input: ListCatechistClassesInput,
  ): Promise<CatechistPortalClassListSnapshot> {
    return this.catechistPortalService.listClasses(input);
  }

  getCatechistClassRoster(
    input: GetCatechistClassRosterInput,
  ): Promise<CatechistPortalClassRosterSnapshot> {
    return this.catechistPortalService.getClassRoster(input);
  }

  getParentContext(rawActorUserId: string): Promise<ParentPortalContextSnapshot> {
    return this.parentPortalService.getContext(rawActorUserId);
  }

  listParentChildren(rawActorUserId: string): Promise<ParentPortalChildrenSnapshot> {
    return this.parentPortalService.listChildren(rawActorUserId);
  }

  getParentEnrollmentProgress(
    input: GetParentEnrollmentProgressInput,
  ): Promise<ParentPortalEnrollmentProgressSnapshot> {
    return this.parentPortalService.getEnrollmentProgress(input);
  }
}
