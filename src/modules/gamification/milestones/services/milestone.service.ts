import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import { MilestoneDefinitionStatus, MilestoneTriggerType } from '../../enums/gamification.enums';
import {
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

  async getDefinitionById(rawId: string): Promise<MilestoneDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MilestoneDefinitionNotFoundError();
    }
    return toMilestoneDefinitionSnapshot(row);
  }

  async findDefinitionByCode(code: string): Promise<MilestoneDefinitionSnapshot | null> {
    const row = await this.definitionRepository.findOne({ where: { code: code.trim() } });
    return row ? toMilestoneDefinitionSnapshot(row) : null;
  }

  async listActiveDefinitions(): Promise<MilestoneDefinitionSnapshot[]> {
    const rows = await this.definitionRepository.find({
      where: { status: MilestoneDefinitionStatus.Active },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return rows.map(toMilestoneDefinitionSnapshot);
  }

  async createDefinition(
    input: CreateMilestoneDefinitionInput,
  ): Promise<MilestoneDefinitionSnapshot> {
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

  async listAchievementsForStudent(
    rawStudentId: string,
  ): Promise<MilestoneAchievementSnapshot[]> {
    const rows = await this.achievementRepository.find({
      where: { studentId: normalizeUuid(rawStudentId) },
      order: { achievedAt: 'DESC' },
    });
    return rows.map(toMilestoneAchievementSnapshot);
  }

  async findAchievement(
    rawMilestoneDefinitionId: string,
    rawStudentId: string,
  ): Promise<MilestoneAchievementSnapshot | null> {
    const row = await this.achievementRepository.findOne({
      where: {
        milestoneDefinitionId: normalizeUuid(rawMilestoneDefinitionId),
        studentId: normalizeUuid(rawStudentId),
      },
    });
    return row ? toMilestoneAchievementSnapshot(row) : null;
  }

  async createAchievement(
    input: CreateMilestoneAchievementInput,
  ): Promise<MilestoneAchievementSnapshot> {
    await this.getDefinitionById(input.milestoneDefinitionId);

    const entity = this.achievementRepository.create({
      milestoneDefinitionId: normalizeUuid(input.milestoneDefinitionId),
      studentId: normalizeUuid(input.studentId),
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      parishId: normalizeUuid(input.parishId),
      achievedAt: input.achievedAt ?? new Date(),
      sourceType: input.sourceType,
      sourceId: normalizeUuid(input.sourceId),
    });

    try {
      const saved = await this.achievementRepository.save(entity);
      return toMilestoneAchievementSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MilestoneAchievementAlreadyExistsError();
      }
      throw error;
    }
  }
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
