import { Injectable } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { AnnouncementScopeType } from '../enums/announcement.enums';
import { AnnouncementAccessDeniedError } from '../errors/announcement.errors';

@Injectable()
export class AnnouncementAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.listUserRoles(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async assertCanManageAnnouncement(
    userId: string,
    target: { scopeType: AnnouncementScopeType; parishId?: string | null },
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (target.scopeType === AnnouncementScopeType.Global) {
      throw new AnnouncementAccessDeniedError(
        'Only super administrators can manage global announcements.',
      );
    }

    if (!target.parishId) {
      throw new AnnouncementAccessDeniedError(
        'Parish ID is required for parish announcements.',
      );
    }

    const memberships = await this.parishScopeService.listActiveParishIdsForMember(userId);
    const hasParish = memberships
      .map((id) => id.toLowerCase())
      .includes(target.parishId.toLowerCase());

    if (!hasParish) {
      throw new AnnouncementAccessDeniedError(
        'Not a member of the target parish for this announcement.',
      );
    }
  }
}
