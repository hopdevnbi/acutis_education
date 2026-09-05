import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import { BADGE_AWARD_SOURCE_MANUAL } from '../../constants/badge-milestone.constants';
import { BadgeAwardMode, BadgeDefinitionStatus, BadgeScopeType } from '../../enums/gamification.enums';
import {
  ActiveBadgeAwardAlreadyExistsError,
  BadgeAlreadyRevokedError,
  BadgeAwardNotAllowedError,
  BadgeAwardNotFoundError,
  BadgeDefinitionNotActiveError,
} from '../../errors/gamification.errors';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
} from '../../interfaces/gamification.interfaces';
import { GamificationAccessService } from '../../access/gamification-access.service';
import { PointAdjustmentService } from '../../points/services/point-adjustment.service';
import { BadgeAwardProcessor } from './badge-award.processor';
import { BadgeService } from './badge.service';

export interface ManualBadgeAwardResult {
  readonly award: BadgeAwardSnapshot;
  readonly definition: BadgeDefinitionSnapshot;
  readonly alreadyExisted: boolean;
}

@Injectable()
export class BadgeManualAwardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly badgeService: BadgeService,
    private readonly badgeAwardProcessor: BadgeAwardProcessor,
    private readonly gamificationAccessService: GamificationAccessService,
    private readonly pointAdjustmentService: PointAdjustmentService,
  ) {}

  async awardManually(input: {
    readonly actorUserId: string;
    readonly studentId: string;
    readonly badgeId: string;
  }): Promise<ManualBadgeAwardResult> {
    const definition = await this.badgeService.getDefinitionById(input.badgeId);
    if (definition.status !== BadgeDefinitionStatus.Active) {
      throw new BadgeDefinitionNotActiveError();
    }
    if (
      definition.awardMode !== BadgeAwardMode.Manual &&
      definition.awardMode !== BadgeAwardMode.Both
    ) {
      throw new BadgeAwardNotAllowedError('Badge awardMode does not allow manual awards.');
    }

    const context = await this.pointAdjustmentService.resolveActiveContextForStudent(
      input.studentId,
    );
    await this.gamificationAccessService.assertStaffCanAwardBadge(input.actorUserId, {
      studentId: input.studentId,
      context,
      definition,
    });

    if (definition.scopeType === BadgeScopeType.Parish) {
      if (!definition.parishId || definition.parishId !== context.parishId) {
        throw new BadgeAwardNotAllowedError('Badge parish scope does not match student parish.');
      }
    }

    const existing = await this.badgeService.findActiveAward(definition.id, input.studentId);
    if (existing) {
      // Stable idempotent behavior: return existing active award (no double bonus).
      return { award: existing, definition, alreadyExisted: true };
    }

    return this.dataSource.transaction(async (manager) => {
      let award: BadgeAwardSnapshot;
      try {
        award = await this.badgeService.createAward(
          {
            badgeDefinitionId: definition.id,
            studentId: context.studentId,
            enrollmentId: context.enrollmentId,
            parishId: context.parishId,
            sourceType: BADGE_AWARD_SOURCE_MANUAL,
            sourceId: generateUuidV4(),
            awardedByUserId: input.actorUserId,
          },
          manager,
        );
      } catch (error: unknown) {
        if (error instanceof ActiveBadgeAwardAlreadyExistsError) {
          const raced = await this.badgeService.findActiveAward(
            definition.id,
            input.studentId,
            manager,
          );
          if (raced) {
            return { award: raced, definition, alreadyExisted: true };
          }
        }
        throw error;
      }

      await this.badgeAwardProcessor.appendBonusIfNeeded({
        definition,
        awardId: award.id,
        studentId: context.studentId,
        enrollmentId: context.enrollmentId,
        parishId: context.parishId,
        academicYearId: context.academicYearId,
        awardedByUserId: input.actorUserId,
        manager,
      });

      return { award, definition, alreadyExisted: false };
    });
  }

  async revokeManually(input: {
    readonly actorUserId: string;
    readonly studentId: string;
    readonly badgeId: string;
  }): Promise<{ award: BadgeAwardSnapshot; definition: BadgeDefinitionSnapshot }> {
    const definition = await this.badgeService.getDefinitionById(input.badgeId);
    const context = await this.pointAdjustmentService.resolveActiveContextForStudent(
      input.studentId,
    );
    await this.gamificationAccessService.assertStaffCanAwardBadge(input.actorUserId, {
      studentId: input.studentId,
      context,
      definition,
    });

    const active = await this.badgeService.findActiveAward(definition.id, input.studentId);
    if (!active) {
      // Look for already-revoked award to distinguish not-found vs already revoked.
      const all = await this.badgeService.listAwardsForStudent(input.studentId, {
        activeOnly: false,
      });
      const prior = all.find((a) => a.badgeDefinitionId === definition.id);
      if (prior?.revokedAt) {
        throw new BadgeAlreadyRevokedError();
      }
      throw new BadgeAwardNotFoundError();
    }

    return this.dataSource.transaction(async (manager) => {
      const revoked = await this.badgeService.revokeAward(active.id, new Date(), manager);
      await this.badgeAwardProcessor.reverseBonusIfPresent({
        awardId: revoked.id,
        actorUserId: input.actorUserId,
        manager,
      });
      return { award: revoked, definition };
    });
  }
}
