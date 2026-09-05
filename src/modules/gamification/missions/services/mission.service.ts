import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import {
  MissionConditionType,
  MissionDefinitionStatus,
  MissionProgressStatus,
  MissionScopeType,
} from '../../enums/gamification.enums';
import {
  InvalidMissionScopeError,
  MissionDefinitionCodeAlreadyExistsError,
  MissionDefinitionNotFoundError,
  MissionProgressNotFoundError,
} from '../../errors/gamification.errors';
import type {
  MissionDefinitionSnapshot,
  MissionProgressSnapshot,
} from '../../interfaces/gamification.interfaces';
import {
  toMissionDefinitionSnapshot,
  toMissionProgressSnapshot,
} from '../../mappers/gamification.mapper';
import { buildMissionScopeKey } from '../../utils/reward-rule.util';
import {
  assertMissionCompletedAtSemantics,
  assertTargetCount,
  capMissionCurrentCount,
  resolveMissionProgressStatus,
} from '../utils/mission-progress.util';
import { MissionDefinitionEntity } from '../entities/mission-definition.entity';
import { MissionProgressEntity } from '../entities/mission-progress.entity';

export interface CreateMissionDefinitionInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status?: MissionDefinitionStatus;
  readonly scopeType: MissionScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly conditionType: MissionConditionType;
  readonly targetCount: number;
  readonly pointsBonus?: number | null;
  readonly startsAt?: Date | null;
  readonly endsAt?: Date | null;
}

export interface UpsertMissionProgressInput {
  readonly missionDefinitionId: string;
  readonly studentId: string;
  readonly enrollmentId?: string | null;
  readonly currentCount: number;
  readonly targetCount: number;
  readonly lastEventId?: string | null;
}

@Injectable()
export class MissionService {
  constructor(
    @InjectRepository(MissionDefinitionEntity)
    private readonly definitionRepository: Repository<MissionDefinitionEntity>,
    @InjectRepository(MissionProgressEntity)
    private readonly progressRepository: Repository<MissionProgressEntity>,
  ) {}

  async getDefinitionById(rawId: string): Promise<MissionDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MissionDefinitionNotFoundError();
    }
    return toMissionDefinitionSnapshot(row);
  }

  async findDefinitionByScopeAndCode(input: {
    readonly scopeType: MissionScopeType;
    readonly parishId?: string | null;
    readonly classId?: string | null;
    readonly code: string;
  }): Promise<MissionDefinitionSnapshot | null> {
    const scopeKey = buildMissionScopeKey(input);
    const row = await this.definitionRepository.findOne({
      where: { scopeKey, code: input.code.trim() },
    });
    return row ? toMissionDefinitionSnapshot(row) : null;
  }

  async listDefinitionsForClass(rawClassId: string): Promise<MissionDefinitionSnapshot[]> {
    const classId = normalizeUuid(rawClassId);
    const rows = await this.definitionRepository.find({
      where: { classId, status: MissionDefinitionStatus.Active },
      order: { code: 'ASC' },
    });
    return rows.map(toMissionDefinitionSnapshot);
  }

  async createDefinition(input: CreateMissionDefinitionInput): Promise<MissionDefinitionSnapshot> {
    assertTargetCount(input.targetCount);
    if (input.pointsBonus != null && input.pointsBonus < 0) {
      throw new InvalidMissionScopeError();
    }
    const scopeKey = buildMissionScopeKey({
      scopeType: input.scopeType,
      parishId: input.parishId ?? null,
      classId: input.classId ?? null,
    });

    const entity = this.definitionRepository.create({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      status: input.status ?? MissionDefinitionStatus.Draft,
      scopeType: input.scopeType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      classId: input.classId ? normalizeUuid(input.classId) : null,
      scopeKey,
      conditionType: input.conditionType,
      targetCount: input.targetCount,
      pointsBonus: input.pointsBonus ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    });

    try {
      const saved = await this.definitionRepository.save(entity);
      return toMissionDefinitionSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MissionDefinitionCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async findProgress(
    rawMissionDefinitionId: string,
    rawStudentId: string,
  ): Promise<MissionProgressSnapshot | null> {
    const row = await this.progressRepository.findOne({
      where: {
        missionDefinitionId: normalizeUuid(rawMissionDefinitionId),
        studentId: normalizeUuid(rawStudentId),
      },
    });
    return row ? toMissionProgressSnapshot(row) : null;
  }

  async listProgressForStudent(rawStudentId: string): Promise<MissionProgressSnapshot[]> {
    const rows = await this.progressRepository.find({
      where: { studentId: normalizeUuid(rawStudentId) },
      order: { updatedAt: 'DESC' },
    });
    return rows.map(toMissionProgressSnapshot);
  }

  async upsertProgress(input: UpsertMissionProgressInput): Promise<MissionProgressSnapshot> {
    const missionDefinitionId = normalizeUuid(input.missionDefinitionId);
    const studentId = normalizeUuid(input.studentId);
    const capped = capMissionCurrentCount(input.currentCount, input.targetCount);
    const status = resolveMissionProgressStatus(capped, input.targetCount);
    const completedAt = status === MissionProgressStatus.Completed ? new Date() : null;
    assertMissionCompletedAtSemantics({ status, completedAt });

    const existing = await this.progressRepository.findOne({
      where: { missionDefinitionId, studentId },
    });

    if (existing) {
      if (existing.status === MissionProgressStatus.Completed) {
        return toMissionProgressSnapshot(existing);
      }
      existing.currentCount = capped;
      existing.targetCount = input.targetCount;
      existing.status = status;
      existing.completedAt = completedAt;
      existing.enrollmentId = input.enrollmentId ? normalizeUuid(input.enrollmentId) : existing.enrollmentId;
      existing.lastEventId = input.lastEventId ? normalizeUuid(input.lastEventId) : existing.lastEventId;
      const saved = await this.progressRepository.save(existing);
      return toMissionProgressSnapshot(saved);
    }

    const entity = this.progressRepository.create({
      missionDefinitionId,
      studentId,
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      currentCount: capped,
      targetCount: input.targetCount,
      status,
      completedAt,
      lastEventId: input.lastEventId ? normalizeUuid(input.lastEventId) : null,
    });

    try {
      const saved = await this.progressRepository.save(entity);
      return toMissionProgressSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.findProgress(missionDefinitionId, studentId);
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  async getProgressOrThrow(
    rawMissionDefinitionId: string,
    rawStudentId: string,
  ): Promise<MissionProgressSnapshot> {
    const progress = await this.findProgress(rawMissionDefinitionId, rawStudentId);
    if (!progress) {
      throw new MissionProgressNotFoundError();
    }
    return progress;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes('UQ_mission') ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}
