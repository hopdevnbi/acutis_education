import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  AnnouncementScopeType,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import {
  AnnouncementAccessDeniedError,
  AnnouncementTargetNotAllowedError,
  InvalidAnnouncementTargetError,
} from '../errors/announcement.errors';
import type {
  AnnouncementSnapshot,
  AnnouncementTargetSnapshot,
  TargetDescriptorInput,
} from '../interfaces/announcement.interfaces';

@Injectable()
export class AnnouncementAccessService {
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

  async assertCanCreateAnnouncement(
    userId: string,
    input: {
      readonly scopeType: AnnouncementScopeType;
      readonly parishId?: string | null;
      readonly targets: readonly TargetDescriptorInput[];
    },
  ): Promise<void> {
    if (input.targets.length === 0) {
      throw new InvalidAnnouncementTargetError('Announcement must have at least one target.');
    }

    if (await this.isSuperAdmin(userId)) {
      if (input.scopeType === AnnouncementScopeType.Global && input.parishId) {
        throw new InvalidAnnouncementTargetError('Global announcements must not specify parishId.');
      }
      if (input.scopeType === AnnouncementScopeType.Parish && !input.parishId) {
        throw new InvalidAnnouncementTargetError('Parish announcements must specify parishId.');
      }
      return;
    }

    // Non-superadmin cannot create GLOBAL root announcements
    if (input.scopeType === AnnouncementScopeType.Global) {
      throw new AnnouncementAccessDeniedError(
        'Only super administrators can create global announcements.',
      );
    }

    if (!input.parishId) {
      throw new InvalidAnnouncementTargetError('Parish announcements must specify parishId.');
    }

    const normalizedParishId = normalizeUuid(input.parishId);
    const isParishAdmin = await this.isParishAdminForParish(userId, normalizedParishId);

    if (isParishAdmin) {
      for (const target of input.targets) {
        if (target.targetType === CommunicationTargetType.Global) {
          throw new AnnouncementTargetNotAllowedError(
            'Parish administrators cannot create GLOBAL targets.',
          );
        }
        if (target.targetType === CommunicationTargetType.Parish) {
          if (!target.parishId || normalizeUuid(target.parishId) !== normalizedParishId) {
            throw new AnnouncementTargetNotAllowedError(
              'Parish target must match announcement parish.',
            );
          }
        }
        if (target.targetType === CommunicationTargetType.Class) {
          if (!target.classId) {
            throw new InvalidAnnouncementTargetError('Class target must specify classId.');
          }
          const classSnapshot = await this.classService.getClassById(target.classId);
          if (normalizeUuid(classSnapshot.parishId) !== normalizedParishId) {
            throw new AnnouncementTargetNotAllowedError(
              'Targeted class must belong to the announcement parish.',
            );
          }
        }
        if (target.targetType === CommunicationTargetType.Role) {
          if (!target.parishId || normalizeUuid(target.parishId) !== normalizedParishId) {
            throw new AnnouncementTargetNotAllowedError(
              'Role target parish must match announcement parish.',
            );
          }
        }
      }
      return;
    }

    // Check if Catechist
    if (await this.isCatechist(userId)) {
      const assignedClassIds = (
        await this.classCatechistAssignmentService.listAssignedClassIds(userId)
      ).map((id) => id.toLowerCase());

      for (const target of input.targets) {
        if (target.targetType !== CommunicationTargetType.Class) {
          throw new AnnouncementTargetNotAllowedError(
            'Catechists are only permitted to create CLASS targets for their assigned classes.',
          );
        }
        if (!target.classId) {
          throw new InvalidAnnouncementTargetError('Class target must specify classId.');
        }
        const normalizedClassId = normalizeUuid(target.classId).toLowerCase();
        if (!assignedClassIds.includes(normalizedClassId)) {
          throw new AnnouncementTargetNotAllowedError(
            'Catechist is not actively assigned to the targeted class.',
          );
        }
        const classSnapshot = await this.classService.getClassById(target.classId);
        if (normalizeUuid(classSnapshot.parishId) !== normalizedParishId) {
          throw new AnnouncementTargetNotAllowedError(
            'Targeted class does not belong to the root announcement parish.',
          );
        }
      }
      return;
    }

    throw new AnnouncementAccessDeniedError(
      'Not authorized to create announcements.',
    );
  }

  async assertCanManageAnnouncement(
    userId: string,
    announcement: AnnouncementSnapshot,
    newTargets?: readonly TargetDescriptorInput[],
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (announcement.scopeType === AnnouncementScopeType.Global) {
      throw new AnnouncementAccessDeniedError(
        'Only super administrators can manage global announcements.',
      );
    }

    if (!announcement.parishId) {
      throw new AnnouncementAccessDeniedError('Invalid announcement without parish.');
    }

    const normalizedParishId = normalizeUuid(announcement.parishId);
    if (await this.isParishAdminForParish(userId, normalizedParishId)) {
      if (newTargets) {
        await this.assertCanCreateAnnouncement(userId, {
          scopeType: announcement.scopeType,
          parishId: announcement.parishId,
          targets: newTargets,
        });
      }
      return;
    }

    if (await this.isCatechist(userId)) {
      if (newTargets) {
        await this.assertCanCreateAnnouncement(userId, {
          scopeType: announcement.scopeType,
          parishId: announcement.parishId,
          targets: newTargets,
        });
        return;
      }
      // Author check for existing announcement
      if (normalizeUuid(announcement.createdByUserId) === normalizeUuid(userId)) {
        return;
      }
    }

    throw new AnnouncementAccessDeniedError(
      'Not authorized to manage this announcement.',
    );
  }

  async assertCanPublishAnnouncement(
    userId: string,
    announcement: AnnouncementSnapshot,
    targets: readonly AnnouncementTargetSnapshot[],
  ): Promise<void> {
    if (targets.length === 0) {
      throw new InvalidAnnouncementTargetError('Cannot publish an announcement without targets.');
    }

    await this.assertCanManageAnnouncement(userId, announcement);

    if (await this.isSuperAdmin(userId)) {
      return;
    }

    // If Catechist, re-verify all class assignments are still active
    if (await this.isCatechist(userId) && !(await this.isParishAdminForParish(userId, announcement.parishId!))) {
      const assignedClassIds = (
        await this.classCatechistAssignmentService.listAssignedClassIds(userId)
      ).map((id) => id.toLowerCase());

      for (const target of targets) {
        if (target.targetType !== CommunicationTargetType.Class || !target.classId) {
          throw new AnnouncementTargetNotAllowedError(
            'Catechist cannot publish non-class targeted announcements.',
          );
        }
        if (!assignedClassIds.includes(normalizeUuid(target.classId).toLowerCase())) {
          throw new AnnouncementTargetNotAllowedError(
            'Catechist assignment to targeted class is no longer active.',
          );
        }
      }
    }
  }

  async assertCanArchiveAnnouncement(
    userId: string,
    announcement: AnnouncementSnapshot,
  ): Promise<void> {
    await this.assertCanManageAnnouncement(userId, announcement);
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

    throw new AnnouncementAccessDeniedError(
      'User does not hold administrative or catechist permissions for announcements.',
    );
  }
}
