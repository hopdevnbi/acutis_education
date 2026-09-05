import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, QueryFailedError, Repository } from 'typeorm';
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
  InvalidBadgeRuleConfigError,
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
import { isBadgeRuleType, parseAndValidateBadgeRuleConfig } from '../../utils/badge-rule.util';
import { assertBadgeLifecycleTransition } from '../utils/badge-lifecycle.util';
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

export interface UpdateBadgeDefinitionInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly category?: string;
  readonly scopeType?: BadgeScopeType;
  readonly parishId?: string | null;
  readonly status?: BadgeDefinitionStatus;
  readonly awardMode?: BadgeAwardMode;
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

  private definitionRepo(manager?: EntityManager): Repository<BadgeDefinitionEntity> {
    return manager
      ? manager.getRepository(BadgeDefinitionEntity)
      : this.definitionRepository;
  }

  private awardRepo(manager?: EntityManager): Repository<BadgeAwardEntity> {
    return manager ? manager.getRepository(BadgeAwardEntity) : this.awardRepository;
  }

  async findDefinitionByCode(code: string): Promise<BadgeDefinitionSnapshot | null> {
    const row = await this.definitionRepository.findOne({ where: { code: code.trim() } });
    return row ? toBadgeDefinitionSnapshot(row) : null;
  }

  async getDefinitionById(
    rawId: string,
    manager?: EntityManager,
  ): Promise<BadgeDefinitionSnapshot> {
    const row = await this.definitionRepo(manager).findOne({
      where: { id: normalizeUuid(rawId) },
    });
    if (!row) {
      throw new BadgeDefinitionNotFoundError();
    }
    return toBadgeDefinitionSnapshot(row);
  }

  async listDefinitions(input?: {
    readonly parishId?: string | null;
    readonly includeGlobal?: boolean;
  }): Promise<BadgeDefinitionSnapshot[]> {
    const includeGlobal = input?.includeGlobal !== false;
    const parishId = input?.parishId ? normalizeUuid(input.parishId) : null;

    if (!parishId && includeGlobal) {
      const rows = await this.definitionRepository.find({ order: { code: 'ASC' } });
      return rows.map(toBadgeDefinitionSnapshot);
    }

    const where: Array<Partial<BadgeDefinitionEntity>> = [];
    if (includeGlobal) {
      where.push({ scopeType: BadgeScopeType.Global });
    }
    if (parishId) {
      where.push({ scopeType: BadgeScopeType.Parish, parishId });
    }
    if (where.length === 0) {
      return [];
    }
    const rows = await this.definitionRepository.find({
      where,
      order: { code: 'ASC' },
    });
    return rows.map(toBadgeDefinitionSnapshot);
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

  /**
   * ACTIVE definitions with AUTOMATIC or BOTH award mode, scoped to GLOBAL or matching parish.
   */
  async listActiveAutomaticDefinitionsForParish(
    parishId: string,
    manager?: EntityManager,
  ): Promise<BadgeDefinitionSnapshot[]> {
    const rows = await this.definitionRepo(manager).find({
      where: [
        {
          status: BadgeDefinitionStatus.Active,
          scopeType: BadgeScopeType.Global,
          awardMode: In([BadgeAwardMode.Automatic, BadgeAwardMode.Both]),
        },
        {
          status: BadgeDefinitionStatus.Active,
          scopeType: BadgeScopeType.Parish,
          parishId: normalizeUuid(parishId),
          awardMode: In([BadgeAwardMode.Automatic, BadgeAwardMode.Both]),
        },
      ],
      order: { code: 'ASC' },
    });
    return rows.map(toBadgeDefinitionSnapshot);
  }

  async createDefinition(input: CreateBadgeDefinitionInput): Promise<BadgeDefinitionSnapshot> {
    this.assertScope(input.scopeType, input.parishId ?? null);
    this.assertRuleForAwardMode(input.awardMode, input.ruleEventType ?? null, input.ruleConfigJson ?? null);
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

  async updateDefinition(
    rawId: string,
    input: UpdateBadgeDefinitionInput,
  ): Promise<BadgeDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new BadgeDefinitionNotFoundError();
    }

    if (input.status !== undefined) {
      assertBadgeLifecycleTransition(row.status, input.status);
      row.status = input.status;
    }
    if (input.code !== undefined) {
      row.code = input.code.trim();
    }
    if (input.name !== undefined) {
      row.name = input.name.trim();
    }
    if (input.description !== undefined) {
      row.description = input.description;
    }
    if (input.category !== undefined) {
      row.category = input.category;
    }
    if (input.scopeType !== undefined || input.parishId !== undefined) {
      const scopeType = input.scopeType ?? row.scopeType;
      const parishId =
        input.parishId !== undefined
          ? input.parishId
          : row.parishId;
      this.assertScope(scopeType, parishId);
      row.scopeType = scopeType;
      row.parishId = parishId ? normalizeUuid(parishId) : null;
    }
    if (input.awardMode !== undefined) {
      row.awardMode = input.awardMode;
    }
    if (input.ruleEventType !== undefined) {
      row.ruleEventType = input.ruleEventType;
    }
    if (input.ruleConfigJson !== undefined) {
      row.ruleConfigJson = input.ruleConfigJson;
    }
    if (input.pointsBonus !== undefined) {
      if (input.pointsBonus != null && input.pointsBonus < 0) {
        throw new Error('pointsBonus must be >= 0 when set.');
      }
      row.pointsBonus = input.pointsBonus;
    }
    if (input.iconMediaAssetId !== undefined) {
      row.iconMediaAssetId = input.iconMediaAssetId
        ? normalizeUuid(input.iconMediaAssetId)
        : null;
    }

    this.assertRuleForAwardMode(row.awardMode, row.ruleEventType, row.ruleConfigJson);

    try {
      const saved = await this.definitionRepository.save(row);
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
    manager?: EntityManager,
  ): Promise<BadgeAwardSnapshot[]> {
    const studentId = normalizeUuid(rawStudentId);
    const rows = await this.awardRepo(manager).find({
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
    manager?: EntityManager,
  ): Promise<BadgeAwardSnapshot | null> {
    const row = await this.awardRepo(manager).findOne({
      where: {
        badgeDefinitionId: normalizeUuid(rawBadgeDefinitionId),
        studentId: normalizeUuid(rawStudentId),
        revokedAt: IsNull(),
      },
    });
    return row ? toBadgeAwardSnapshot(row) : null;
  }

  async getAwardById(rawAwardId: string, manager?: EntityManager): Promise<BadgeAwardSnapshot> {
    const row = await this.awardRepo(manager).findOne({
      where: { id: normalizeUuid(rawAwardId) },
    });
    if (!row) {
      throw new BadgeAwardNotFoundError();
    }
    return toBadgeAwardSnapshot(row);
  }

  async createAward(
    input: CreateBadgeAwardInput,
    manager?: EntityManager,
  ): Promise<BadgeAwardSnapshot> {
    await this.getDefinitionById(input.badgeDefinitionId, manager);

    const repository = this.awardRepo(manager);
    const entity = repository.create({
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
      const saved = await repository.save(entity);
      return toBadgeAwardSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error, 'UQ_badge_awards_active_definition_student')) {
        throw new ActiveBadgeAwardAlreadyExistsError();
      }
      throw error;
    }
  }

  /** Soft revoke — no hard delete. Idempotent if already revoked. */
  async revokeAward(
    rawAwardId: string,
    revokedAt: Date = new Date(),
    manager?: EntityManager,
  ): Promise<BadgeAwardSnapshot> {
    const repository = this.awardRepo(manager);
    const row = await repository.findOne({ where: { id: normalizeUuid(rawAwardId) } });
    if (!row) {
      throw new BadgeAwardNotFoundError();
    }
    if (row.revokedAt) {
      return toBadgeAwardSnapshot(row);
    }
    row.revokedAt = revokedAt;
    const saved = await repository.save(row);
    return toBadgeAwardSnapshot(saved);
  }

  private assertScope(scopeType: BadgeScopeType, parishId: string | null): void {
    if (scopeType === BadgeScopeType.Global && parishId) {
      throw new InvalidBadgeScopeError();
    }
    if (scopeType === BadgeScopeType.Parish && !parishId) {
      throw new InvalidBadgeScopeError();
    }
  }

  private assertRuleForAwardMode(
    awardMode: BadgeAwardMode,
    ruleEventType: string | null,
    ruleConfigJson: string | null,
  ): void {
    if (awardMode === BadgeAwardMode.Manual) {
      return;
    }
    if (!ruleEventType || !isBadgeRuleType(ruleEventType)) {
      throw new InvalidBadgeRuleConfigError(
        'AUTOMATIC/BOTH badges require a typed ruleEventType.',
      );
    }
    parseAndValidateBadgeRuleConfig(ruleEventType, ruleConfigJson);
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
