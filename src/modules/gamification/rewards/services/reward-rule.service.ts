import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { RewardRuleStatus, RewardScopeType } from '../enums/gamification.enums';
import {
  InvalidRewardRuleScopeError,
  RewardRuleCodeAlreadyExistsError,
  RewardRuleNotFoundError,
} from '../errors/gamification.errors';
import type { RewardRuleSnapshot } from '../interfaces/gamification.interfaces';
import { toRewardRuleSnapshot } from '../mappers/gamification.mapper';
import {
  assertMaxAwardsPerSource,
  assertRewardRuleScope,
  isRewardRuleEffectiveAt,
} from '../utils/reward-rule.util';
import { RewardRuleEntity } from './entities/reward-rule.entity';

export interface CreateRewardRuleInput {
  readonly code: string;
  readonly eventType: string;
  readonly sourceType: string;
  readonly points: number;
  readonly status?: RewardRuleStatus;
  readonly maxAwardsPerSource?: number;
  readonly scopeType: RewardScopeType;
  readonly parishId?: string | null;
  readonly effectiveFrom?: Date | null;
  readonly effectiveTo?: Date | null;
}

export interface UpdateRewardRuleInput {
  readonly points?: number;
  readonly status?: RewardRuleStatus;
  readonly maxAwardsPerSource?: number;
  readonly effectiveFrom?: Date | null;
  readonly effectiveTo?: Date | null;
}

@Injectable()
export class RewardRuleService {
  constructor(
    @InjectRepository(RewardRuleEntity)
    private readonly rewardRuleRepository: Repository<RewardRuleEntity>,
  ) {}

  async findByCode(rawCode: string): Promise<RewardRuleSnapshot | null> {
    const code = rawCode.trim();
    const row = await this.rewardRuleRepository.findOne({ where: { code } });
    return row ? toRewardRuleSnapshot(row) : null;
  }

  async getById(rawId: string): Promise<RewardRuleSnapshot> {
    const id = normalizeUuid(rawId);
    const row = await this.rewardRuleRepository.findOne({ where: { id } });
    if (!row) {
      throw new RewardRuleNotFoundError();
    }
    return toRewardRuleSnapshot(row);
  }

  async findActiveMatchingRules(input: {
    readonly eventType: string;
    readonly parishId: string;
    readonly at?: Date;
  }): Promise<RewardRuleSnapshot[]> {
    const at = input.at ?? new Date();
    const rows = await this.rewardRuleRepository.find({
      where: [
        {
          eventType: input.eventType,
          status: RewardRuleStatus.Active,
          scopeType: RewardScopeType.Global,
        },
        {
          eventType: input.eventType,
          status: RewardRuleStatus.Active,
          scopeType: RewardScopeType.Parish,
          parishId: normalizeUuid(input.parishId),
        },
      ],
      order: { code: 'ASC' },
    });

    return rows
      .filter((row) => isRewardRuleEffectiveAt(row, at))
      .map(toRewardRuleSnapshot);
  }

  async create(input: CreateRewardRuleInput): Promise<RewardRuleSnapshot> {
    assertRewardRuleScope({ scopeType: input.scopeType, parishId: input.parishId ?? null });
    if (input.points < 0) {
      throw new InvalidRewardRuleScopeError();
    }
    const maxAwards = input.maxAwardsPerSource ?? 1;
    assertMaxAwardsPerSource(maxAwards);

    const entity = this.rewardRuleRepository.create({
      code: input.code.trim(),
      eventType: input.eventType,
      sourceType: input.sourceType,
      points: input.points,
      status: input.status ?? RewardRuleStatus.Active,
      maxAwardsPerSource: maxAwards,
      scopeType: input.scopeType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
    });

    try {
      const saved = await this.rewardRuleRepository.save(entity);
      return toRewardRuleSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new RewardRuleCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async update(rawId: string, input: UpdateRewardRuleInput): Promise<RewardRuleSnapshot> {
    const id = normalizeUuid(rawId);
    const row = await this.rewardRuleRepository.findOne({ where: { id } });
    if (!row) {
      throw new RewardRuleNotFoundError();
    }
    if (input.points !== undefined) {
      if (input.points < 0) {
        throw new InvalidRewardRuleScopeError();
      }
      row.points = input.points;
    }
    if (input.status !== undefined) {
      row.status = input.status;
    }
    if (input.maxAwardsPerSource !== undefined) {
      assertMaxAwardsPerSource(input.maxAwardsPerSource);
      row.maxAwardsPerSource = input.maxAwardsPerSource;
    }
    if (input.effectiveFrom !== undefined) {
      row.effectiveFrom = input.effectiveFrom;
    }
    if (input.effectiveTo !== undefined) {
      row.effectiveTo = input.effectiveTo;
    }
    const saved = await this.rewardRuleRepository.save(row);
    return toRewardRuleSnapshot(saved);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes('UQ_reward_rules_code') ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}
