import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { CLASS_SESSION_TITLE_MAX_LENGTH } from '../constants/class-operations.constants';
import { ClassSessionEntity } from '../entities/class-session.entity';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  ClassSessionNotFoundError,
  InvalidClassSessionIdError,
  InvalidClassSessionTimeRangeError,
} from '../errors/class-operations.errors';
import type {
  CreateClassSessionInput,
  ListClassSessionsByClassInput,
  ClassSessionListResult,
  UpdateClassSessionInput,
  ClassSessionSnapshot,
} from '../interfaces/class-session.interface';
import { toClassSessionSnapshot } from '../mappers/class-session.mapper';
import {
  assertClassSessionEditable,
  assertClassSessionTransition,
} from '../utils/class-session-lifecycle.util';

@Injectable()
export class ClassSessionService {
  constructor(
    @InjectRepository(ClassSessionEntity)
    private readonly classSessionRepository: Repository<ClassSessionEntity>,
  ) {}

  async getSessionById(rawSessionId: string): Promise<ClassSessionSnapshot> {
    const session = await this.findSessionEntity(rawSessionId);

    return toClassSessionSnapshot(session);
  }

  async findSessionById(rawSessionId: string): Promise<ClassSessionSnapshot | null> {
    if (!isUuidV4(rawSessionId)) {
      return null;
    }

    const session = await this.classSessionRepository.findOne({
      where: { id: normalizeUuid(rawSessionId) },
    });

    return session === null ? null : toClassSessionSnapshot(session);
  }

  async listSessionsByClass(input: ListClassSessionsByClassInput): Promise<ClassSessionListResult> {
    const classId = normalizeUuid(input.classId);
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const queryBuilder = this.classSessionRepository
      .createQueryBuilder('session')
      .where('session.classId = :classId', { classId });

    if (input.status !== undefined) {
      queryBuilder.andWhere('session.status = :status', { status: input.status });
    }

    if (input.fromStartsAt !== undefined) {
      queryBuilder.andWhere('session.startsAt >= :fromStartsAt', {
        fromStartsAt: input.fromStartsAt,
      });
    }

    if (input.toStartsAt !== undefined) {
      queryBuilder.andWhere('session.startsAt <= :toStartsAt', {
        toStartsAt: input.toStartsAt,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('session.startsAt', 'DESC')
      .addOrderBy('session.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const sessions = await queryBuilder.getMany();

    return {
      items: sessions.map(toClassSessionSnapshot),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async createSession(
    input: CreateClassSessionInput,
    entityManager?: EntityManager,
  ): Promise<ClassSessionSnapshot> {
    this.assertValidTimeRange(input.startsAt, input.endsAt);

    const repository =
      entityManager?.getRepository(ClassSessionEntity) ?? this.classSessionRepository;

    const session = repository.create({
      classId: normalizeUuid(input.classId),
      parishId: normalizeUuid(input.parishId),
      academicYearId: normalizeUuid(input.academicYearId),
      title: this.normalizeTitle(input.title),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: ClassSessionStatus.Scheduled,
      cancelledAt: null,
      completedAt: null,
      createdByUserId: normalizeUuid(input.createdByUserId),
      updatedByUserId: null,
    });

    const saved = await repository.save(session);

    return toClassSessionSnapshot(saved);
  }

  async updateSession(
    rawSessionId: string,
    input: UpdateClassSessionInput,
  ): Promise<ClassSessionSnapshot> {
    const session = await this.findSessionEntity(rawSessionId);
    assertClassSessionEditable(session.status);

    const nextStartsAt = input.startsAt ?? session.startsAt;
    const nextEndsAt = input.endsAt ?? session.endsAt;
    this.assertValidTimeRange(nextStartsAt, nextEndsAt);

    if (input.title !== undefined) {
      session.title = this.normalizeTitle(input.title);
    }

    if (input.startsAt !== undefined) {
      session.startsAt = input.startsAt;
    }

    if (input.endsAt !== undefined) {
      session.endsAt = input.endsAt;
    }

    session.updatedByUserId = normalizeUuid(input.updatedByUserId);

    const saved = await this.classSessionRepository.save(session);

    return toClassSessionSnapshot(saved);
  }

  async transitionSession(
    rawSessionId: string,
    targetStatus: ClassSessionStatus.Completed | ClassSessionStatus.Cancelled,
    updatedByUserId: string,
  ): Promise<ClassSessionSnapshot> {
    const session = await this.findSessionEntity(rawSessionId);
    assertClassSessionTransition(session.status, targetStatus);

    const now = new Date();

    if (targetStatus === ClassSessionStatus.Completed) {
      session.status = ClassSessionStatus.Completed;
      session.completedAt = now;
      session.cancelledAt = null;
    } else {
      session.status = ClassSessionStatus.Cancelled;
      session.cancelledAt = now;
      session.completedAt = null;
    }

    session.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.classSessionRepository.save(session);

    return toClassSessionSnapshot(saved);
  }

  private async findSessionEntity(rawSessionId: string): Promise<ClassSessionEntity> {
    if (!isUuidV4(rawSessionId)) {
      throw new InvalidClassSessionIdError();
    }

    const session = await this.classSessionRepository.findOne({
      where: { id: normalizeUuid(rawSessionId) },
    });

    if (session === null) {
      throw new ClassSessionNotFoundError();
    }

    return session;
  }

  private assertValidTimeRange(startsAt: Date, endsAt: Date): void {
    if (!(endsAt.getTime() > startsAt.getTime())) {
      throw new InvalidClassSessionTimeRangeError();
    }
  }

  private normalizeTitle(rawTitle: string | null | undefined): string | null {
    if (rawTitle === undefined || rawTitle === null) {
      return null;
    }

    const trimmed = rawTitle.trim();

    if (trimmed.length === 0) {
      return null;
    }

    return trimmed.slice(0, CLASS_SESSION_TITLE_MAX_LENGTH);
  }
}
