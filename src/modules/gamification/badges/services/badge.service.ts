import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import {
  BadgeAwardMode,
  BadgeDefinitionStatus,
  BadgeScopeType,
} from '../../enums/gamification.enums';
import {
  ActiveBadgeAwardAlreadyExistsError,
  BadgeAwardNotFoundError,
  BadgeDefinitionCodeAlreadyExistsError,
  BadgeDefinitionNotFoundError,
  InvalidBadgeScopeError,
} from '../../errors/gamification.errors';
import type {
  BadgeAwardSnapshot,
  BadgeDefinitionSnapshot,
} from '../../interfaces/gamification.interfaces';
import {
  toBadgeAwardSnapshot,
  toBadgeDefinitionSnapshot,
} from '../../mappers/gamification.mapper';
import { BadgeAwardEntity } from '../entities/badge-award.entity';
import { BadgeDefinitionEntity } from '../entities/badge-definition.entity';

export interface CreateBadgeDefinitionInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly category: string;
  readonly scopeType: BadgeScopeType;
  readonly parishId?: string | null;
  readonly status?: BadgeDefinitionStatus;
  readonly awardMode: BadgeAwardMode;
  readonly ruleEventType?: string | null;
  readonly ruleConfigJson?: string | null;
  readonly pointsBonus?: number | null;
  readonly iconMediaAssetId?: string | null;
}

export interface CreateBadgeAwardInput {
  readonly badgeDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly parishId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly awardedByUserId?: string | null;
  readonly awardedAt?: Date;
}

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(BadgeDefinitionEntity)
    private readonly definitionRepository: Repository<BadgeDefinitionEntity>,
    @InjectRepository(BadgeAwardEntity)
    private readonly awardRepository: Repository<BadgeAwardEntity>,
  ) {}

  async findDefinitionByCode(code: string): Promise<BadgeDefinitionSnapshot | null> {
    const row = await this.definitionRepository.findOne({ where: { code: code.trim() } });
    return row ? toBadgeDefinitionSnapshot(row) : null;
  }

  async getDefinitionById(rawId: string): Promise<BadgeDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new BadgeDefinitionNotFoundError();
    }
    return toBadgeDefinitionSnapshot(row);
  }

  async listActiveDefinitions(parishId?: string | null): Promise<BadgeDefinitionSnapshot[]> {
    const rows = await this.definitionRepository.find({
      where: [
        { status: BadgeDefinitionStatus.Active, scopeType: BadgeScopeType.Global },
        ...(parishId
          ? [
              {
                status: BadgeDefinitionStatus.Active,
                scopeType: BadgeScopeType.Parish,
                parishId: normalizeUuid(parishId),
              },
            ]
          : []),
      ],
      order: { code: 'ASC' },
    });
    return rows.map(toBadgeDefinitionSnapshot);
  }

  async createDefinition(input: CreateBadgeDefinitionInput): Promise<BadgeDefinitionSnapshot> {
    if (input.scopeType === BadgeScopeType.Global && input.parishId) {
      throw new InvalidBadgeScopeError();
    }
    if (input.scopeType === BadgeScopeType.Parish && !input.parishId) {
      throw new InvalidBadgeScopeError();
    }
    if (input.pointsBonus != null && input.pointsBonus < 0) {
      throw new Error('pointsBonus must be >= 0 when set.');
    }

    const entity = this.definitionRepository.create({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      category: input.category,
      scopeType: input.scopeType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      status: input.status ?? BadgeDefinitionStatus.Draft,
      awardMode: input.awardMode,
      ruleEventType: input.ruleEventType ?? null,
      ruleConfigJson: input.ruleConfigJson ?? null,
      pointsBonus: input.pointsBonus ?? null,
      iconMediaAssetId: input.iconMediaAssetId ? normalizeUuid(input.iconMediaAssetId) : null,
    });

    try {
      const saved = await this.definitionRepository.save(entity);
      return toBadgeDefinitionSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error, 'UQ_badge_definitions_code')) {
        throw new BadgeDefinitionCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async listAwardsForStudent(
    rawStudentId: string,
    options: { readonly activeOnly?: boolean } = {},
  ): Promise<BadgeAwardSnapshot[]> {
    const studentId = normalizeUuid(rawStudentId);
    const rows = await this.awardRepository.find({
      where: {
        studentId,
        ...(options.activeOnly === true ? { revokedAt: IsNull() } : {}),
      },
      order: { awardedAt: 'DESC' },
    });
    return rows.map(toBadgeAwardSnapshot);
  }

  async findActiveAward(
    rawBadgeDefinitionId: string,
    rawStudentId: string,
  ): Promise<BadgeAwardSnapshot | null> {
    const row = await this.awardRepository.findOne({
      where: {
        badgeDefinitionId: normalizeUuid(rawBadgeDefinitionId),
        studentId: normalizeUuid(rawStudentId),
        revokedAt: IsNull(),
      },
    });
    return row ? toBadgeAwardSnapshot(row) : null;
  }

  async createAward(input: CreateBadgeAwardInput): Promise<BadgeAwardSnapshot> {
    await this.getDefinitionById(input.badgeDefinitionId);

    const entity = this.awardRepository.create({
      badgeDefinitionId: normalizeUuid(input.badgeDefinitionId),
      studentId: normalizeUuid(input.studentId),
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      parishId: normalizeUuid(input.parishId),
      awardedAt: input.awardedAt ?? new Date(),
      sourceType: input.sourceType,
      sourceId: normalizeUuid(input.sourceId),
      awardedByUserId: input.awardedByUserId ? normalizeUuid(input.awardedByUserId) : null,
      revokedAt: null,
    });

    try {
      const saved = await this.awardRepository.save(entity);
      return toBadgeAwardSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error, 'UQ_badge_awards_active_definition_student')) {
        throw new ActiveBadgeAwardAlreadyExistsError();
      }
      throw error;
    }
  }

  /** Soft revoke — no hard delete. */
  async revokeAward(rawAwardId: string, revokedAt: Date = new Date()): Promise<BadgeAwardSnapshot> {
    const row = await this.awardRepository.findOne({ where: { id: normalizeUuid(rawAwardId) } });
    if (!row) {
      throw new BadgeAwardNotFoundError();
    }
    if (row.revokedAt) {
      return toBadgeAwardSnapshot(row);
    }
    row.revokedAt = revokedAt;
    const saved = await this.awardRepository.save(row);
    return toBadgeAwardSnapshot(saved);
  }
}

function isUniqueViolation(error: unknown, indexName: string): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes(indexName) ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}
