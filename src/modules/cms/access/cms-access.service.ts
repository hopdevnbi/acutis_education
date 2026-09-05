import { Injectable } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { CmsScopeType } from '../enums/cms.enums';
import { CmsAccessDeniedError } from '../errors/cms.errors';

@Injectable()
export class CmsAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.listUserRoles(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async assertCanManageCms(
    userId: string,
    target: { scopeType: CmsScopeType; parishId?: string | null },
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (target.scopeType === CmsScopeType.Global) {
      throw new CmsAccessDeniedError('Only super administrators can manage global CMS entries.');
    }

    if (!target.parishId) {
      throw new CmsAccessDeniedError('Parish ID is required for parish CMS entries.');
    }

    const memberships = await this.parishScopeService.listActiveParishIdsForMember(userId);
    const hasParish = memberships
      .map((id) => id.toLowerCase())
      .includes(target.parishId.toLowerCase());

    if (!hasParish) {
      throw new CmsAccessDeniedError('Not a member of the target parish for this CMS entry.');
    }
  }
}
