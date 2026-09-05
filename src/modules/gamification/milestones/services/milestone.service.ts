import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import { MilestoneDefinitionStatus, MilestoneTriggerType } from '../../enums/gamification.enums';
import {
  InvalidMilestoneTriggerConfigError,
  MilestoneAchievementAlreadyExistsError,
  MilestoneDefinitionCodeAlreadyExistsError,
  MilestoneDefinitionNotFoundError,
} from '../../errors/gamification.errors';
import type {
  MilestoneAchievementSnapshot,
  MilestoneDefinitionSnapshot,
} from '../../interfaces/gamification.interfaces';
import {
  toMilestoneAchievementSnapshot,
  toMilestoneDefinitionSnapshot,
} from '../../mappers/gamification.mapper';
import {
  isMilestoneTriggerType,
  parseAndValidateMilestoneTriggerConfig,
} from '../../utils/milestone-trigger.util';
import { MilestoneAchievementEntity } from '../entities/milestone-achievement.entity';
import { MilestoneDefinitionEntity } from '../entities/milestone-definition.entity';

export interface CreateMilestoneDefinitionInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status?: MilestoneDefinitionStatus;
  readonly triggerType: MilestoneTriggerType;
  readonly triggerConfigJson?: string | null;
  readonly sortOrder?: number;
}

export interface UpdateMilestoneDefinitionInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: MilestoneDefinitionStatus;
  readonly triggerType?: MilestoneTriggerType;
  readonly triggerConfigJson?: string | null;
  readonly sortOrder?: number;
}

export interface CreateMilestoneAchievementInput {
  readonly milestoneDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly parishId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly achievedAt?: Date;
}

@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(MilestoneDefinitionEntity)
    private readonly definitionRepository: Repository<MilestoneDefinitionEntity>,
    @InjectRepository(MilestoneAchievementEntity)
    private readonly achievementRepository: Repository<MilestoneAchievementEntity>,
  ) {}

  private definitionRepo(manager?: EntityManager): Repository<MilestoneDefinitionEntity> {
    return manager
      ? manager.getRepository(MilestoneDefinitionEntity)
      : this.definitionRepository;
  }

  private achievementRepo(manager?: EntityManager): Repository<MilestoneAchievementEntity> {
    return manager
      ? manager.getRepository(MilestoneAchievementEntity)
      : this.achievementRepository;
  }

  async getDefinitionById(
    rawId: string,
    manager?: EntityManager,
  ): Promise<MilestoneDefinitionSnapshot> {
    const row = await this.definitionRepo(manager).findOne({
      where: { id: normalizeUuid(rawId) },
    });
    if (!row) {
      throw new MilestoneDefinitionNotFoundError();
    }
    return toMilestoneDefinitionSnapshot(row);
  }

  async findDefinitionByCode(code: string): Promise<MilestoneDefinitionSnapshot | null> {
    const row = await this.definitionRepository.findOne({ where: { code: code.trim() } });
    return row ? toMilestoneDefinitionSnapshot(row) : null;
  }

  async listDefinitions(): Promise<MilestoneDefinitionSnapshot[]> {
    const rows = await this.definitionRepository.find({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return rows.map(toMilestoneDefinitionSnapshot);
  }

  async listActiveDefinitions(manager?: EntityManager): Promise<MilestoneDefinitionSnapshot[]> {
    const rows = await this.definitionRepo(manager).find({
      where: { status: MilestoneDefinitionStatus.Active },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return rows.map(toMilestoneDefinitionSnapshot);
  }

  async createDefinition(
    input: CreateMilestoneDefinitionInput,
  ): Promise<MilestoneDefinitionSnapshot> {
    if (!isMilestoneTriggerType(input.triggerType)) {
      throw new InvalidMilestoneTriggerConfigError('Unsupported milestone trigger type.');
    }
    parseAndValidateMilestoneTriggerConfig(input.triggerType, input.triggerConfigJson ?? null);

    const entity = this.definitionRepository.create({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      status: input.status ?? MilestoneDefinitionStatus.Active,
      triggerType: input.triggerType,
      triggerConfigJson: input.triggerConfigJson ?? null,
      sortOrder: input.sortOrder ?? 0,
    });

    try {
      const saved = await this.definitionRepository.save(entity);
      return toMilestoneDefinitionSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MilestoneDefinitionCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async updateDefinition(
    rawId: string,
    input: UpdateMilestoneDefinitionInput,
  ): Promise<MilestoneDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MilestoneDefinitionNotFoundError();
    }

    if (input.status !== undefined) {
      assertMilestoneLifecycleTransition(row.status, input.status);
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
    if (input.triggerType !== undefined) {
      row.triggerType = input.triggerType;
    }
    if (input.triggerConfigJson !== undefined) {
      row.triggerConfigJson = input.triggerConfigJson;
    }
    if (input.sortOrder !== undefined) {
      row.sortOrder = input.sortOrder;
    }

    parseAndValidateMilestoneTriggerConfig(row.triggerType, row.triggerConfigJson);

    try {
      const saved = await this.definitionRepository.save(row);
      return toMilestoneDefinitionSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MilestoneDefinitionCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async listAchievementsForStudent(
    rawStudentId: string,
    manager?: EntityManager,
  ): Promise<MilestoneAchievementSnapshot[]> {
    const rows = await this.achievementRepo(manager).find({
      where: { studentId: normalizeUuid(rawStudentId) },
      order: { achievedAt: 'DESC' },
    });
    return rows.map(toMilestoneAchievementSnapshot);
  }

  async findAchievement(
    rawMilestoneDefinitionId: string,
    rawStudentId: string,
    manager?: EntityManager,
  ): Promise<MilestoneAchievementSnapshot | null> {
    const row = await this.achievementRepo(manager).findOne({
      where: {
        milestoneDefinitionId: normalizeUuid(rawMilestoneDefinitionId),
        studentId: normalizeUuid(rawStudentId),
      },
    });
    return row ? toMilestoneAchievementSnapshot(row) : null;
  }

  async createAchievement(
    input: CreateMilestoneAchievementInput,
    manager?: EntityManager,
  ): Promise<MilestoneAchievementSnapshot> {
    await this.getDefinitionById(input.milestoneDefinitionId, manager);

    const repository = this.achievementRepo(manager);
    const entity = repository.create({
      milestoneDefinitionId: normalizeUuid(input.milestoneDefinitionId),
      studentId: normalizeUuid(input.studentId),
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      parishId: normalizeUuid(input.parishId),
      achievedAt: input.achievedAt ?? new Date(),
      sourceType: input.sourceType,
      sourceId: normalizeUuid(input.sourceId),
    });

    try {
      const saved = await repository.save(entity);
      return toMilestoneAchievementSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MilestoneAchievementAlreadyExistsError();
      }
      throw error;
    }
  }
}

function assertMilestoneLifecycleTransition(
  from: MilestoneDefinitionStatus,
  to: MilestoneDefinitionStatus,
): void {
  if (from === to) {
    return;
  }
  // ACTIVE -> ARCHIVED only (no ARCHIVED -> ACTIVE in MVP).
  if (from === MilestoneDefinitionStatus.Active && to === MilestoneDefinitionStatus.Archived) {
    return;
  }
  throw new InvalidMilestoneTriggerConfigError(
    `Invalid milestone lifecycle transition: ${from} -> ${to}.`,
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes('UQ_milestone') ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}
