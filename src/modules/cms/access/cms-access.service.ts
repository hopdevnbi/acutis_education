import { Injectable } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { CmsScopeType } from '../enums/cms.enums';
import {
  CmsAccessDeniedError,
  CmsScopeAccessDeniedError,
  InvalidCmsScopeError,
} from '../errors/cms.errors';

@Injectable()
export class CmsAccessService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(userId);
    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async assertCanManageCmsScope(
    userId: string,
    target: { scopeType: CmsScopeType; parishId?: string | null },
  ): Promise<void> {
    if (await this.isSuperAdmin(userId)) {
      return;
    }

    if (target.scopeType === CmsScopeType.Global) {
      throw new CmsScopeAccessDeniedError(
        'Only super administrators can manage global CMS entries.',
      );
    }

    if (!target.parishId) {
      throw new InvalidCmsScopeError('Parish ID is required for parish CMS entries.');
    }

    const hasMembership = await this.parishScopeService.hasActiveParishMembership(
      userId,
      target.parishId,
    );

    if (!hasMembership) {
      throw new CmsScopeAccessDeniedError(
        'Not authorized to manage CMS entries for this parish.',
      );
    }
  }

  async assertCanManageEntry(
    userId: string,
    entry: { scopeType: CmsScopeType; parishId: string | null },
  ): Promise<void> {
    await this.assertCanManageCmsScope(userId, {
      scopeType: entry.scopeType,
      parishId: entry.parishId,
    });
  }

  async listVisibleParishIds(userId: string): Promise<string[]> {
    return this.parishScopeService.listActiveParishIdsForMember(userId);
  }

  async assertCanReadParishCms(userId: string | null, parishId: string): Promise<void> {
    if (!userId) {
      throw new CmsAccessDeniedError(
        'Anonymous users cannot access parish-scoped CMS entries.',
      );
    }

    if (await this.isSuperAdmin(userId)) {
      return;
    }

    const hasMembership = await this.parishScopeService.hasActiveParishMembership(
      userId,
      parishId,
    );

    if (!hasMembership) {
      throw new CmsAccessDeniedError(
        'Not authorized to view CMS entries for this parish.',
      );
    }
  }
}
