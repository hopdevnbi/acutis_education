import { Injectable } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { NotificationAccessDeniedError } from '../errors/notification.errors';

@Injectable()
export class NotificationAccessService {
  constructor(private readonly accessControlService: AccessControlService) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.listUserRoles(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async assertCanAccessUserInbox(actorUserId: string, targetUserId: string): Promise<void> {
    if (actorUserId.toLowerCase() === targetUserId.toLowerCase()) {
      return;
    }
    if (await this.isSuperAdmin(actorUserId)) {
      return;
    }
    throw new NotificationAccessDeniedError('Cannot access another user’s notification inbox.');
  }
}
