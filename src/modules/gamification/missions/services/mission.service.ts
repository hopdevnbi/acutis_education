import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
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
  MissionDefinitionNotEditableError,
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
  assertMissionLifecycleTransition,
  MISSION_ACTIVE_EDITABLE_FIELDS,
} from '../utils/mission-lifecycle.util';
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
  readonly scopeType: MissionScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly conditionType: MissionConditionType;
  readonly targetCount: number;
  readonly pointsBonus?: number | null;
  readonly startsAt?: Date | null;
  readonly endsAt?: Date | null;
}

export interface UpdateMissionDefinitionInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly scopeType?: MissionScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly conditionType?: MissionConditionType;
  readonly targetCount?: number;
  readonly pointsBonus?: number | null;
  readonly startsAt?: Date | null;
  readonly endsAt?: Date | null;
}

export interface ListMissionDefinitionsQuery {
  readonly page: number;
  readonly limit: number;
  readonly status?: MissionDefinitionStatus;
  readonly scopeType?: MissionScopeType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly conditionType?: MissionConditionType;
  /** When set, restrict to these parish IDs (ParishAdmin). */
  readonly parishIds?: readonly string[];
  /** When set, restrict to these class IDs (Catechist). */
  readonly classIds?: readonly string[];
}

export interface MissionDefinitionListResult {
  readonly items: readonly MissionDefinitionSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ListMissionProgressQuery {
  readonly missionDefinitionId: string;
  readonly page: number;
  readonly limit: number;
  /** Restrict to these student IDs (Catechist class roster). */
  readonly studentIds?: readonly string[];
  readonly status?: MissionProgressStatus;
}

export interface MissionProgressListResult {
  readonly items: readonly MissionProgressSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

@Injectable()
export class MissionService {
  constructor(
    @InjectRepository(MissionDefinitionEntity)
    private readonly definitionRepository: Repository<MissionDefinitionEntity>,
    @InjectRepository(MissionProgressEntity)
    private readonly progressRepository: Repository<MissionProgressEntity>,
  ) {}

  private definitionRepo(manager?: EntityManager): Repository<MissionDefinitionEntity> {
    return manager
      ? manager.getRepository(MissionDefinitionEntity)
      : this.definitionRepository;
  }

  private progressRepo(manager?: EntityManager): Repository<MissionProgressEntity> {
    return manager ? manager.getRepository(MissionProgressEntity) : this.progressRepository;
  }

  async getDefinitionById(
    rawId: string,
    manager?: EntityManager,
  ): Promise<MissionDefinitionSnapshot> {
    const row = await this.definitionRepo(manager).findOne({
      where: { id: normalizeUuid(rawId) },
    });
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

  async listDefinitions(query: ListMissionDefinitionsQuery): Promise<MissionDefinitionListResult> {
    const page = Math.max(1, query.page);
    const limit = Math.min(50, Math.max(1, query.limit));
    const qb = this.definitionRepository.createQueryBuilder('mission');

    if (query.status) {
      qb.andWhere('mission.status = :status', { status: query.status });
    }
    if (query.scopeType) {
      qb.andWhere('mission.scopeType = :scopeType', { scopeType: query.scopeType });
    }
    if (query.parishId) {
      qb.andWhere('mission.parishId = :parishId', {
        parishId: normalizeUuid(query.parishId),
      });
    }
    if (query.classId) {
      qb.andWhere('mission.classId = :classId', {
        classId: normalizeUuid(query.classId),
      });
    }
    if (query.conditionType) {
      qb.andWhere('mission.conditionType = :conditionType', {
        conditionType: query.conditionType,
      });
    }
    if (query.parishIds && query.parishIds.length > 0) {
      qb.andWhere('mission.parishId IN (:...parishIds)', {
        parishIds: query.parishIds.map(normalizeUuid),
      });
    }
    if (query.classIds && query.classIds.length > 0) {
      qb.andWhere('mission.classId IN (:...classIds)', {
        classIds: query.classIds.map(normalizeUuid),
      });
    }

    qb.orderBy('mission.createdAt', 'DESC').addOrderBy('mission.id', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map(toMissionDefinitionSnapshot),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async listDefinitionsForClass(
    rawClassId: string,
    options: { readonly status?: MissionDefinitionStatus } = {},
  ): Promise<MissionDefinitionSnapshot[]> {
    const classId = normalizeUuid(rawClassId);
    const rows = await this.definitionRepository.find({
      where: {
        classId,
        ...(options.status ? { status: options.status } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return rows.map(toMissionDefinitionSnapshot);
  }

  /**
   * Bounded load of ACTIVE missions for event matching (GLOBAL + parish + optional class).
   */
  async listActiveDefinitionsMatchingEventContext(
    input: {
      readonly parishId: string;
      readonly classId?: string | null;
      readonly conditionType: MissionConditionType;
    },
    manager?: EntityManager,
  ): Promise<MissionDefinitionSnapshot[]> {
    const parishId = normalizeUuid(input.parishId);
    const where: Array<Partial<MissionDefinitionEntity>> = [
      {
        status: MissionDefinitionStatus.Active,
        scopeType: MissionScopeType.Global,
        conditionType: input.conditionType,
      },
      {
        status: MissionDefinitionStatus.Active,
        scopeType: MissionScopeType.Parish,
        parishId,
        conditionType: input.conditionType,
      },
    ];
    if (input.classId) {
      where.push({
        status: MissionDefinitionStatus.Active,
        scopeType: MissionScopeType.Class,
        classId: normalizeUuid(input.classId),
        conditionType: input.conditionType,
      });
    }
    const rows = await this.definitionRepo(manager).find({ where });
    return rows.map(toMissionDefinitionSnapshot);
  }

  /**
   * Eligible ACTIVE missions for a learner (GLOBAL + parish + class scopes) — set-based.
   */
  async listEligibleActiveDefinitionsForLearner(input: {
    readonly parishId: string;
    readonly classIds: readonly string[];
  }): Promise<MissionDefinitionSnapshot[]> {
    const parishId = normalizeUuid(input.parishId);
    const classIds = input.classIds.map(normalizeUuid);
    const qb = this.definitionRepository
      .createQueryBuilder('mission')
      .where('mission.status = :status', { status: MissionDefinitionStatus.Active })
      .andWhere(
        `(
          mission.scopeType = :global
          OR (mission.scopeType = :parish AND mission.parishId = :parishId)
          OR (mission.scopeType = :classScope AND mission.classId IN (:...classIds))
        )`,
        {
          global: MissionScopeType.Global,
          parish: MissionScopeType.Parish,
          classScope: MissionScopeType.Class,
          parishId,
          classIds: classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000'],
        },
      )
      .orderBy('mission.createdAt', 'DESC')
      .addOrderBy('mission.id', 'DESC');

    const rows = await qb.getMany();
    return rows.map(toMissionDefinitionSnapshot);
  }

  async listDefinitionsByIds(
    rawIds: readonly string[],
  ): Promise<MissionDefinitionSnapshot[]> {
    if (rawIds.length === 0) {
      return [];
    }
    const ids = rawIds.map(normalizeUuid);
    const rows = await this.definitionRepository.find({
      where: { id: In(ids) },
    });
    return rows.map(toMissionDefinitionSnapshot);
  }

  async findDefinitionsByIds(
    rawIds: readonly string[],
  ): Promise<Map<string, MissionDefinitionSnapshot>> {
    const list = await this.listDefinitionsByIds(rawIds);
    const map = new Map<string, MissionDefinitionSnapshot>();
    for (const item of list) {
      map.set(item.id, item);
    }
    return map;
  }

  async createDefinition(input: CreateMissionDefinitionInput): Promise<MissionDefinitionSnapshot> {
    assertTargetCount(input.targetCount);
    if (input.pointsBonus != null && input.pointsBonus < 0) {
      throw new InvalidMissionScopeError();
    }
    this.assertDateWindow(input.startsAt ?? null, input.endsAt ?? null);
    const scopeKey = buildMissionScopeKey({
      scopeType: input.scopeType,
      parishId: input.parishId ?? null,
      classId: input.classId ?? null,
    });

    const entity = this.definitionRepository.create({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      status: MissionDefinitionStatus.Draft,
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

  async updateDefinition(
    rawId: string,
    input: UpdateMissionDefinitionInput,
  ): Promise<MissionDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MissionDefinitionNotFoundError();
    }

    if (row.status === MissionDefinitionStatus.Archived) {
      throw new MissionDefinitionNotEditableError('ARCHIVED missions are read-only.');
    }

    if (row.status === MissionDefinitionStatus.Active) {
      const forbiddenKeys = Object.keys(input).filter(
        (key) =>
          input[key as keyof UpdateMissionDefinitionInput] !== undefined &&
          !MISSION_ACTIVE_EDITABLE_FIELDS.includes(key as never),
      );
      if (forbiddenKeys.length > 0) {
        throw new MissionDefinitionNotEditableError(
          `ACTIVE missions may only edit: ${MISSION_ACTIVE_EDITABLE_FIELDS.join(', ')}.`,
        );
      }
      if (input.name !== undefined) {
        row.name = input.name.trim();
      }
      if (input.description !== undefined) {
        row.description = input.description;
      }
      if (input.endsAt !== undefined) {
        this.assertDateWindow(row.startsAt, input.endsAt);
        row.endsAt = input.endsAt;
      }
      const saved = await this.definitionRepository.save(row);
      return toMissionDefinitionSnapshot(saved);
    }

    // DRAFT — full edit
    if (input.code !== undefined) {
      row.code = input.code.trim();
    }
    if (input.name !== undefined) {
      row.name = input.name.trim();
    }
    if (input.description !== undefined) {
      row.description = input.description;
    }
    if (
      input.scopeType !== undefined ||
      input.parishId !== undefined ||
      input.classId !== undefined
    ) {
      const scopeType = input.scopeType ?? row.scopeType;
      const parishId =
        input.parishId !== undefined ? input.parishId : row.parishId;
      const classId = input.classId !== undefined ? input.classId : row.classId;
      row.scopeType = scopeType;
      row.parishId = parishId ? normalizeUuid(parishId) : null;
      row.classId = classId ? normalizeUuid(classId) : null;
      row.scopeKey = buildMissionScopeKey({
        scopeType,
        parishId: row.parishId,
        classId: row.classId,
      });
    }
    if (input.conditionType !== undefined) {
      row.conditionType = input.conditionType;
    }
    if (input.targetCount !== undefined) {
      assertTargetCount(input.targetCount);
      row.targetCount = input.targetCount;
    }
    if (input.pointsBonus !== undefined) {
      if (input.pointsBonus != null && input.pointsBonus < 0) {
        throw new InvalidMissionScopeError();
      }
      row.pointsBonus = input.pointsBonus;
    }
    if (input.startsAt !== undefined) {
      row.startsAt = input.startsAt;
    }
    if (input.endsAt !== undefined) {
      row.endsAt = input.endsAt;
    }
    this.assertDateWindow(row.startsAt, row.endsAt);

    try {
      const saved = await this.definitionRepository.save(row);
      return toMissionDefinitionSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MissionDefinitionCodeAlreadyExistsError();
      }
      throw error;
    }
  }

  async activateDefinition(rawId: string): Promise<MissionDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MissionDefinitionNotFoundError();
    }
    assertMissionLifecycleTransition(row.status, MissionDefinitionStatus.Active);
    assertTargetCount(row.targetCount);
    buildMissionScopeKey({
      scopeType: row.scopeType,
      parishId: row.parishId,
      classId: row.classId,
    });
    this.assertDateWindow(row.startsAt, row.endsAt);
    row.status = MissionDefinitionStatus.Active;
    const saved = await this.definitionRepository.save(row);
    return toMissionDefinitionSnapshot(saved);
  }

  async archiveDefinition(rawId: string): Promise<MissionDefinitionSnapshot> {
    const row = await this.definitionRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new MissionDefinitionNotFoundError();
    }
    assertMissionLifecycleTransition(row.status, MissionDefinitionStatus.Archived);
    row.status = MissionDefinitionStatus.Archived;
    const saved = await this.definitionRepository.save(row);
    return toMissionDefinitionSnapshot(saved);
  }

  async findProgress(
    rawMissionDefinitionId: string,
    rawStudentId: string,
    manager?: EntityManager,
  ): Promise<MissionProgressSnapshot | null> {
    const row = await this.progressRepo(manager).findOne({
      where: {
        missionDefinitionId: normalizeUuid(rawMissionDefinitionId),
        studentId: normalizeUuid(rawStudentId),
      },
    });
    return row ? toMissionProgressSnapshot(row) : null;
  }

  async listProgressForStudent(
    rawStudentId: string,
    manager?: EntityManager,
  ): Promise<MissionProgressSnapshot[]> {
    const rows = await this.progressRepo(manager).find({
      where: { studentId: normalizeUuid(rawStudentId) },
      order: { updatedAt: 'DESC' },
    });
    return rows.map(toMissionProgressSnapshot);
  }

  async listProgressForStudentByMissionIds(
    rawStudentId: string,
    missionDefinitionIds: readonly string[],
  ): Promise<MissionProgressSnapshot[]> {
    if (missionDefinitionIds.length === 0) {
      return [];
    }
    const rows = await this.progressRepository.find({
      where: {
        studentId: normalizeUuid(rawStudentId),
        missionDefinitionId: In(missionDefinitionIds.map(normalizeUuid)),
      },
    });
    return rows.map(toMissionProgressSnapshot);
  }

  async listProgressPaginated(
    query: ListMissionProgressQuery,
  ): Promise<MissionProgressListResult> {
    const page = Math.max(1, query.page);
    const limit = Math.min(50, Math.max(1, query.limit));
    const qb = this.progressRepository
      .createQueryBuilder('progress')
      .where('progress.missionDefinitionId = :missionId', {
        missionId: normalizeUuid(query.missionDefinitionId),
      });

    if (query.status) {
      qb.andWhere('progress.status = :status', { status: query.status });
    }
    if (query.studentIds && query.studentIds.length > 0) {
      qb.andWhere('progress.studentId IN (:...studentIds)', {
        studentIds: query.studentIds.map(normalizeUuid),
      });
    } else if (query.studentIds && query.studentIds.length === 0) {
      return { items: [], page, limit, total: 0, totalPages: 0 };
    }

    qb.orderBy('progress.updatedAt', 'DESC').addOrderBy('progress.id', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map(toMissionProgressSnapshot),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async countCompletedProgressForStudent(rawStudentId: string): Promise<number> {
    return this.progressRepository.count({
      where: {
        studentId: normalizeUuid(rawStudentId),
        status: MissionProgressStatus.Completed,
      },
    });
  }

  async findLatestCompletedProgressForStudent(
    rawStudentId: string,
    manager?: EntityManager,
  ): Promise<MissionProgressSnapshot | null> {
    const row = await this.progressRepo(manager).findOne({
      where: {
        studentId: normalizeUuid(rawStudentId),
        status: MissionProgressStatus.Completed,
      },
      order: { completedAt: 'DESC', updatedAt: 'DESC' },
    });
    return row ? toMissionProgressSnapshot(row) : null;
  }

  /**
   * Increment progress by 1 for an eligible event. enrollmentId is set only on create (initial context).
   * Completed rows never reopen/increment.
   */
  async applyEventIncrement(
    input: {
      readonly missionDefinitionId: string;
      readonly studentId: string;
      readonly enrollmentId?: string | null;
      readonly targetCount: number;
      readonly eventId: string;
      readonly occurredAt: Date;
    },
    manager?: EntityManager,
  ): Promise<{
    readonly progress: MissionProgressSnapshot;
    readonly newlyCompleted: boolean;
  }> {
    const missionDefinitionId = normalizeUuid(input.missionDefinitionId);
    const studentId = normalizeUuid(input.studentId);
    const repository = this.progressRepo(manager);
    const existing = await repository.findOne({
      where: { missionDefinitionId, studentId },
    });

    if (existing) {
      if (existing.status === MissionProgressStatus.Completed) {
        return { progress: toMissionProgressSnapshot(existing), newlyCompleted: false };
      }
      const nextCount = capMissionCurrentCount(existing.currentCount + 1, input.targetCount);
      const status = resolveMissionProgressStatus(nextCount, input.targetCount);
      const newlyCompleted = status === MissionProgressStatus.Completed;
      existing.currentCount = nextCount;
      existing.targetCount = input.targetCount;
      existing.status = status;
      existing.completedAt = newlyCompleted ? input.occurredAt : null;
      existing.lastEventId = normalizeUuid(input.eventId);
      // enrollmentId: initial context only — do not overwrite
      assertMissionCompletedAtSemantics({
        status: existing.status,
        completedAt: existing.completedAt,
      });
      const saved = await repository.save(existing);
      return { progress: toMissionProgressSnapshot(saved), newlyCompleted };
    }

    const currentCount = capMissionCurrentCount(1, input.targetCount);
    const status = resolveMissionProgressStatus(currentCount, input.targetCount);
    const newlyCompleted = status === MissionProgressStatus.Completed;
    const entity = repository.create({
      missionDefinitionId,
      studentId,
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      currentCount,
      targetCount: input.targetCount,
      status,
      completedAt: newlyCompleted ? input.occurredAt : null,
      lastEventId: normalizeUuid(input.eventId),
    });
    assertMissionCompletedAtSemantics({
      status: entity.status,
      completedAt: entity.completedAt,
    });

    try {
      const saved = await repository.save(entity);
      return { progress: toMissionProgressSnapshot(saved), newlyCompleted };
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Race: re-read and treat as no new completion if already completed
        const raced = await this.findProgress(missionDefinitionId, studentId, manager);
        if (raced) {
          return { progress: raced, newlyCompleted: false };
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

  private assertDateWindow(startsAt: Date | null, endsAt: Date | null): void {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new InvalidMissionScopeError();
    }
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
