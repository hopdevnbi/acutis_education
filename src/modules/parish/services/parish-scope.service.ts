import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishMembershipEntity } from '../entities/parish-membership.entity';
import { ParishMembershipStatus } from '../enums/parish-membership-status.enum';
import { InvalidParishIdError } from '../errors/parish.errors';
import { ParishScopeAccessDeniedError } from '../errors/parish-scope.errors';

@Injectable()
export class ParishScopeService {
  constructor(
    @InjectRepository(ParishMembershipEntity)
    private readonly parishMembershipRepository: Repository<ParishMembershipEntity>,
    private readonly accessControlService: AccessControlService,
  ) {}

  async isSuperAdmin(rawUserId: string): Promise<boolean> {
    const roles = await this.accessControlService.getRolesForUser(rawUserId);

    return roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE);
  }

  async hasActiveParishMembership(rawUserId: string, rawParishId: string): Promise<boolean> {
    if (!isUuidV4(rawParishId)) {
      return false;
    }

    const userId = normalizeUuid(rawUserId);
    const parishId = normalizeUuid(rawParishId);
    const membership = await this.parishMembershipRepository.findOne({
      where: {
        userId,
        parishId,
        status: ParishMembershipStatus.Active,
      },
    });

    return membership !== null;
  }

  async listActiveParishIdsForMember(rawUserId: string): Promise<string[]> {
    const userId = normalizeUuid(rawUserId);
    const memberships = await this.parishMembershipRepository.find({
      where: {
        userId,
        status: ParishMembershipStatus.Active,
      },
    });

    return memberships.map((membership) => normalizeUuid(membership.parishId));
  }

  async hasAnyActiveParishMembership(rawUserId: string): Promise<boolean> {
    const userId = normalizeUuid(rawUserId);
    const count = await this.parishMembershipRepository.count({
      where: {
        userId,
        status: ParishMembershipStatus.Active,
      },
    });

    return count > 0;
  }

  async assertCanManageParish(rawUserId: string, rawParishId: string): Promise<void> {
    if (!isUuidV4(rawParishId)) {
      throw new InvalidParishIdError();
    }

    if (await this.isSuperAdmin(rawUserId)) {
      return;
    }

    if (await this.hasActiveParishMembership(rawUserId, rawParishId)) {
      return;
    }

    throw new ParishScopeAccessDeniedError();
  }

  async assertCanReadParishAsAdmin(rawUserId: string, rawParishId: string): Promise<void> {
    await this.assertCanManageParish(rawUserId, rawParishId);
  }
}
