import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { UserAccountService } from '../../users/services/user-account.service';
import { ParishMembershipEntity } from '../entities/parish-membership.entity';
import { ParishMembershipStatus } from '../enums/parish-membership-status.enum';
import { ParishMembershipPrerequisiteError } from '../errors/parish-membership.errors';
import type { ParishMembershipSnapshot } from '../interfaces/parish-membership.interface';
import { toParishMembershipSnapshot } from '../mappers/parish-membership.mapper';
import { ParishService } from './parish.service';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class ParishMembershipService {
  constructor(
    @InjectRepository(ParishMembershipEntity)
    private readonly parishMembershipRepository: Repository<ParishMembershipEntity>,
    private readonly parishService: ParishService,
    private readonly userAccountService: UserAccountService,
  ) {}

  async ensureActiveMembership(
    rawParishId: string,
    rawUserId: string,
  ): Promise<ParishMembershipSnapshot> {
    await this.parishService.getParishById(rawParishId);

    if (!isUuidV4(rawUserId)) {
      throw new ParishMembershipPrerequisiteError('User id must be a valid UUID v4.');
    }

    const parishId = normalizeUuid(rawParishId);
    const userId = normalizeUuid(rawUserId);
    const accountSnapshot = await this.userAccountService.getAccountSnapshotById(userId);

    if (accountSnapshot === null) {
      throw new ParishMembershipPrerequisiteError(
        'User account must exist before parish membership.',
      );
    }

    const existingMembership = await this.parishMembershipRepository.findOne({
      where: {
        parishId,
        userId,
        status: ParishMembershipStatus.Active,
      },
    });

    if (existingMembership !== null) {
      return toParishMembershipSnapshot(existingMembership);
    }

    const membership = this.parishMembershipRepository.create({
      parishId,
      userId,
      status: ParishMembershipStatus.Active,
      joinedAt: new Date(),
      endedAt: null,
    });

    try {
      const savedMembership = await this.parishMembershipRepository.save(membership);

      return toParishMembershipSnapshot(savedMembership);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        const concurrentMembership = await this.parishMembershipRepository.findOne({
          where: {
            parishId,
            userId,
            status: ParishMembershipStatus.Active,
          },
        });

        if (concurrentMembership !== null) {
          return toParishMembershipSnapshot(concurrentMembership);
        }
      }

      throw error;
    }
  }

  async listActiveUserIdsByParishId(rawParishId: string): Promise<string[]> {
    if (!isUuidV4(rawParishId)) {
      return [];
    }

    const parishId = normalizeUuid(rawParishId);
    const rows = await this.parishMembershipRepository.find({
      where: {
        parishId,
        status: ParishMembershipStatus.Active,
      },
      select: ['userId'],
    });

    return Array.from(new Set(rows.map((row) => normalizeUuid(row.userId))));
  }
}
