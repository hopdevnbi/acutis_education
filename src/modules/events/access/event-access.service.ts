import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { CommunicationTargetType, EventScopeType } from '../enums/event.enums';
import {
  EventAccessDeniedError,
  EventTargetNotAllowedError,
  InvalidEventScopeError,
} from '../errors/event.errors';
import type {
  EventSnapshot,
  EventTargetInput,
  EventTargetSnapshot,
} from '../interfaces/event.interfaces';

@Injectable()
export class EventAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly classService: ClassService,
  ) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async isParishAdminForParish(userId: string, parishId: string): Promise<boolean> {
    if (await this.isSuperAdmin(userId)) {
      return true;
    }
    const roles = await this.accessControlService.getRolesForUser(userId);
    const hasParishAdminRole = roles.some((r) => r.code === 'PARISH_ADMIN');
    if (!hasParishAdminRole) {
      return false;
    }
    return this.parishScopeService.hasActiveParishMembership(userId, parishId);
  }

  async isCatechist(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(userId);
    return roles.some((r) => r.code === 'CATECHIST');
  }

  async assertCanCreateEvent(
    userId: string,
    input: {
      readonly scopeType: EventScopeType;
      readonly parishId?: string | null;
      readonly classId?: string | null;
      readonly targets?: readonly EventTargetInput[];
    },
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      if (input.scopeType === EventScopeType.Global && (input.parishId || input.classId)) {
        throw new InvalidEventScopeError('Global events must not specify parishId or classId.');
      }
      if (input.scopeType === EventScopeType.Parish && !input.parishId) {
        throw new InvalidEventScopeError('Parish events must specify parishId.');
      }
      if (input.scopeType === EventScopeType.Class && (!input.classId || !input.parishId)) {
        throw new InvalidEventScopeError('Class events must specify classId and parishId.');
      }
      return;
    }

    // Non-superadmin cannot create GLOBAL events
    if (input.scopeType === EventScopeType.Global) {
      throw new EventAccessDeniedError('Only super administrators can create global events.');
    }

    // Check if ParishAdmin
    if (input.parishId) {
      const normalizedParishId = normalizeUuid(input.parishId);
      const isParishAdmin = await this.isParishAdminForParish(userId, normalizedParishId);

      if (isParishAdmin) {
        if (input.scopeType === EventScopeType.Class) {
          if (!input.classId) {
            throw new InvalidEventScopeError('Class events must specify classId.');
          }
          const classSnapshot = await this.classService.getClassById(input.classId);
          if (normalizeUuid(classSnapshot.parishId) !== normalizedParishId) {
            throw new EventAccessDeniedError('Targeted class does not belong to your parish.');
          }
        }

        if (input.targets && input.targets.length > 0) {
          for (const target of input.targets) {
            if (target.targetType === CommunicationTargetType.Global) {
              throw new EventTargetNotAllowedError(
                'Parish administrators cannot create GLOBAL targets.',
              );
            }
            if (target.targetType === CommunicationTargetType.Parish) {
              if (!target.parishId || normalizeUuid(target.parishId) !== normalizedParishId) {
                throw new EventTargetNotAllowedError(
                  'Parish target must match event parish.',
                );
              }
            }
            if (target.targetType === CommunicationTargetType.Class) {
              if (!target.classId) {
                throw new InvalidEventScopeError('Class target must specify classId.');
              }
              const classSnapshot = await this.classService.getClassById(target.classId);
              if (normalizeUuid(classSnapshot.parishId) !== normalizedParishId) {
                throw new EventTargetNotAllowedError(
                  'Targeted class must belong to the event parish.',
                );
              }
            }
            if (target.targetType === CommunicationTargetType.Role) {
              if (!target.parishId || normalizeUuid(target.parishId) !== normalizedParishId) {
                throw new EventTargetNotAllowedError(
                  'Role target parish must match event parish.',
                );
              }
            }
          }
        }
        return;
      }
    }

    // Check if Catechist
    if (await this.isCatechist(userId)) {
      if (input.scopeType !== EventScopeType.Class || !input.classId) {
        throw new EventAccessDeniedError(
          'Catechists may only manage CLASS-scoped events for actively assigned classes.',
        );
      }

      const assignedClassIds = (
        await this.classCatechistAssignmentService.listAssignedClassIds(userId)
      ).map((id) => id.toLowerCase());

      const normalizedClassId = normalizeUuid(input.classId).toLowerCase();
      if (!assignedClassIds.includes(normalizedClassId)) {
        throw new EventAccessDeniedError(
          'Catechist is not actively assigned to this class.',
        );
      }

      const classSnapshot = await this.classService.getClassById(input.classId);
      if (input.parishId && normalizeUuid(input.parishId) !== normalizeUuid(classSnapshot.parishId)) {
        throw new InvalidEventScopeError('Event parishId must match the class parishId.');
      }

      if (input.targets && input.targets.length > 0) {
        for (const target of input.targets) {
          if (target.targetType !== CommunicationTargetType.Class) {
            throw new EventTargetNotAllowedError(
              'Catechists are only permitted to target their assigned classes.',
            );
          }
          if (!target.classId || !assignedClassIds.includes(normalizeUuid(target.classId).toLowerCase())) {
            throw new EventTargetNotAllowedError(
              'Catechist cannot target unassigned classes.',
            );
          }
        }
      }
      return;
    }

    throw new EventAccessDeniedError('Not authorized to create events.');
  }

  async assertCanManageEvent(
    userId: string,
    event: EventSnapshot,
    newTargets?: readonly EventTargetInput[],
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (event.scopeType === EventScopeType.Global) {
      throw new EventAccessDeniedError('Only super administrators can manage global events.');
    }

    if (event.parishId) {
      const normalizedParishId = normalizeUuid(event.parishId);
      if (await this.isParishAdminForParish(userId, normalizedParishId)) {
        if (newTargets) {
          await this.assertCanCreateEvent(userId, {
            scopeType: event.scopeType,
            parishId: event.parishId,
            classId: event.classId,
            targets: newTargets,
          });
        }
        return;
      }
    }

    if (await this.isCatechist(userId)) {
      if (event.scopeType === EventScopeType.Class && event.classId) {
        const assignedClassIds = (
          await this.classCatechistAssignmentService.listAssignedClassIds(userId)
        ).map((id) => id.toLowerCase());

        if (assignedClassIds.includes(normalizeUuid(event.classId).toLowerCase())) {
          if (newTargets) {
            await this.assertCanCreateEvent(userId, {
              scopeType: event.scopeType,
              parishId: event.parishId,
              classId: event.classId,
              targets: newTargets,
            });
          }
          return;
        }
      }
    }

    throw new EventAccessDeniedError('Not authorized to manage this event.');
  }

  async assertCanPublishEvent(
    userId: string,
    event: EventSnapshot,
    targets: readonly EventTargetSnapshot[],
  ): Promise<void> {
    await this.assertCanManageEvent(userId, event);

    if (await this.isSuperAdmin(userId)) {
      return;
    }

    // If Catechist, confirm assignment is still active
    if (await this.isCatechist(userId) && (!event.parishId || !(await this.isParishAdminForParish(userId, event.parishId)))) {
      const assignedClassIds = (
        await this.classCatechistAssignmentService.listAssignedClassIds(userId)
      ).map((id) => id.toLowerCase());

      if (event.classId && !assignedClassIds.includes(normalizeUuid(event.classId).toLowerCase())) {
        throw new EventAccessDeniedError('Catechist class assignment is no longer active.');
      }

      for (const target of targets) {
        if (target.targetType === CommunicationTargetType.Class && target.classId) {
          if (!assignedClassIds.includes(normalizeUuid(target.classId).toLowerCase())) {
            throw new EventAccessDeniedError(
              'Catechist assignment to targeted class is no longer active.',
            );
          }
        }
      }
    }
  }

  async assertCanCancelEvent(userId: string, event: EventSnapshot): Promise<void> {
    await this.assertCanManageEvent(userId, event);
  }

  async assertCanCompleteEvent(userId: string, event: EventSnapshot): Promise<void> {
    await this.assertCanManageEvent(userId, event);
  }

  async assertCanArchiveEvent(userId: string, event: EventSnapshot): Promise<void> {
    await this.assertCanManageEvent(userId, event);
  }

  async assertCanCheckIn(userId: string, event: EventSnapshot): Promise<void> {
    await this.assertCanManageEvent(userId, event);
  }

  async getAdminActorScope(userId: string): Promise<{
    readonly isSuperAdmin: boolean;
    readonly adminParishIds: readonly string[];
    readonly assignedClassIds: readonly string[];
    readonly isCatechistOnly: boolean;
  }> {
    if (await this.isSuperAdmin(userId)) {
      return {
        isSuperAdmin: true,
        adminParishIds: [],
        assignedClassIds: [],
        isCatechistOnly: false,
      };
    }

    const roles = await this.accessControlService.getRolesForUser(userId);
    const isParishAdmin = roles.some((r) => r.code === 'PARISH_ADMIN');
    const isCatechist = roles.some((r) => r.code === 'CATECHIST');

    if (isParishAdmin) {
      const adminParishIds = await this.parishScopeService.listActiveParishIdsForMember(userId);
      return {
        isSuperAdmin: false,
        adminParishIds,
        assignedClassIds: [],
        isCatechistOnly: false,
      };
    }

    if (isCatechist) {
      const assignedClassIds =
        await this.classCatechistAssignmentService.listAssignedClassIds(userId);
      return {
        isSuperAdmin: false,
        adminParishIds: [],
        assignedClassIds,
        isCatechistOnly: true,
      };
    }

    throw new EventAccessDeniedError(
      'User does not hold administrative or catechist permissions for events.',
    );
  }
}
