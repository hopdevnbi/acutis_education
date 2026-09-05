import { Injectable } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { EventScopeType } from '../enums/event.enums';
import { EventAccessDeniedError } from '../errors/event.errors';

@Injectable()
export class EventAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.listUserRoles(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async assertCanManageEvent(
    userId: string,
    target: { scopeType: EventScopeType; parishId?: string | null },
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (target.scopeType === EventScopeType.Global) {
      throw new EventAccessDeniedError('Only super administrators can manage global events.');
    }

    if (!target.parishId) {
      throw new EventAccessDeniedError('Parish ID is required for parish/class events.');
    }

    const memberships = await this.parishScopeService.listActiveParishIdsForMember(userId);
    const hasParish = memberships
      .map((id) => id.toLowerCase())
      .includes(target.parishId.toLowerCase());

    if (!hasParish) {
      throw new EventAccessDeniedError('Not a member of the target parish for this event.');
    }
  }
}
