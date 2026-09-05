import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassSessionRosterEntity } from '../entities/class-session-roster.entity';
import type {
  FreezeRosterEntryInput,
  SessionRosterEntrySnapshot,
} from '../interfaces/class-session.interface';
import { toSessionRosterEntrySnapshot } from '../mappers/class-session-roster.mapper';
import type { ClassSessionStatus } from '../enums/class-session-status.enum';
import { assertRosterMutable } from '../utils/roster-immutability.util';

@Injectable()
export class ClassSessionRosterService {
  constructor(
    @InjectRepository(ClassSessionRosterEntity)
    private readonly rosterRepository: Repository<ClassSessionRosterEntity>,
  ) {}

  async listBySessionId(rawSessionId: string): Promise<SessionRosterEntrySnapshot[]> {
    const sessionId = normalizeUuid(rawSessionId);
    const rows = await this.rosterRepository.find({
      where: { sessionId },
      order: { displayNameSnapshot: 'ASC' },
    });

    return rows.map(toSessionRosterEntrySnapshot);
  }

  async countBySessionId(rawSessionId: string): Promise<number> {
    const sessionId = normalizeUuid(rawSessionId);

    return this.rosterRepository.count({ where: { sessionId } });
  }

  async countBySessionIds(rawSessionIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    if (rawSessionIds.length === 0) {
      return new Map();
    }

    const sessionIds = rawSessionIds.map((id) => normalizeUuid(id));
    const rows = await this.rosterRepository
      .createQueryBuilder('roster')
      .select('roster.sessionId', 'sessionId')
      .addSelect('COUNT(1)', 'rosterCount')
      .where('roster.sessionId IN (:...sessionIds)', { sessionIds })
      .groupBy('roster.sessionId')
      .getRawMany<{ sessionId: string; rosterCount: string }>();

    return new Map(
      rows.map((row) => [normalizeUuid(row.sessionId), Number(row.rosterCount)] as const),
    );
  }

  async replaceRoster(
    rawSessionId: string,
    entries: readonly FreezeRosterEntryInput[],
    options: {
      readonly sessionStatus: ClassSessionStatus;
      readonly attendanceCount: number;
      readonly entityManager?: EntityManager;
    },
  ): Promise<SessionRosterEntrySnapshot[]> {
    assertRosterMutable(options.sessionStatus, options.attendanceCount);

    const sessionId = normalizeUuid(rawSessionId);
    const repository =
      options.entityManager?.getRepository(ClassSessionRosterEntity) ?? this.rosterRepository;

    await repository.delete({ sessionId });

    if (entries.length === 0) {
      return [];
    }

    const entities = entries.map((entry) =>
      repository.create({
        sessionId,
        enrollmentId: normalizeUuid(entry.enrollmentId),
        studentId: normalizeUuid(entry.studentId),
        displayNameSnapshot: entry.displayNameSnapshot.trim().slice(0, 128),
      }),
    );

    const saved = await repository.save(entities);

    return saved.map(toSessionRosterEntrySnapshot);
  }

  async freezeInitialRoster(
    rawSessionId: string,
    entries: readonly FreezeRosterEntryInput[],
    entityManager?: EntityManager,
  ): Promise<SessionRosterEntrySnapshot[]> {
    const sessionId = normalizeUuid(rawSessionId);
    const repository =
      entityManager?.getRepository(ClassSessionRosterEntity) ?? this.rosterRepository;

    if (entries.length === 0) {
      return [];
    }

    const entities = entries.map((entry) =>
      repository.create({
        sessionId,
        enrollmentId: normalizeUuid(entry.enrollmentId),
        studentId: normalizeUuid(entry.studentId),
        displayNameSnapshot: entry.displayNameSnapshot.trim().slice(0, 128),
      }),
    );

    const saved = await repository.save(entities);

    return saved.map(toSessionRosterEntrySnapshot);
  }
}
