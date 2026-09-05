import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { ClassSessionRosterEntity } from '../entities/class-session-roster.entity';
import { ClassSessionEntity } from '../entities/class-session.entity';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  AttendanceAlreadyFinalizedError,
  AttendanceEnrollmentNotInSessionRosterError,
} from '../errors/class-operations.errors';
import type {
  AttendanceEnrollmentSummary,
  AttendanceRecordSnapshot,
  UpsertAttendanceRecordInput,
} from '../interfaces/attendance.interface';
import { toAttendanceRecordSnapshot } from '../mappers/attendance-record.mapper';
import {
  assertNoDuplicateEnrollmentIds,
  normalizeAttendanceNote,
  parseAttendanceStatus,
} from '../utils/attendance-bulk-input.util';
import {
  incrementStatusCount,
  toAttendanceEnrollmentSummary,
} from '../utils/attendance-summary.util';
import { isAttendanceWritable } from '../utils/class-session-lifecycle.util';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepository: Repository<AttendanceRecordEntity>,
    @InjectRepository(ClassSessionRosterEntity)
    private readonly rosterRepository: Repository<ClassSessionRosterEntity>,
    @InjectRepository(ClassSessionEntity)
    private readonly classSessionRepository: Repository<ClassSessionEntity>,
  ) {}

  async listBySessionId(rawSessionId: string): Promise<AttendanceRecordSnapshot[]> {
    const sessionId = normalizeUuid(rawSessionId);
    const rows = await this.attendanceRepository.find({
      where: { sessionId },
      order: { markedAt: 'ASC' },
    });

    return rows.map(toAttendanceRecordSnapshot);
  }

  async listByEnrollmentId(rawEnrollmentId: string): Promise<AttendanceRecordSnapshot[]> {
    const enrollmentId = normalizeUuid(rawEnrollmentId);
    const rows = await this.attendanceRepository.find({
      where: { enrollmentId },
      order: { markedAt: 'DESC' },
    });

    return rows.map(toAttendanceRecordSnapshot);
  }

  async countBySessionId(rawSessionId: string): Promise<number> {
    const sessionId = normalizeUuid(rawSessionId);

    return this.attendanceRepository.count({ where: { sessionId } });
  }

  async countMarkedBySessionIds(
    rawSessionIds: readonly string[],
  ): Promise<ReadonlyMap<string, number>> {
    if (rawSessionIds.length === 0) {
      return new Map();
    }

    const sessionIds = rawSessionIds.map((id) => normalizeUuid(id));
    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.sessionId', 'sessionId')
      .addSelect('COUNT(1)', 'markedCount')
      .where('attendance.sessionId IN (:...sessionIds)', { sessionIds })
      .groupBy('attendance.sessionId')
      .getRawMany<{ sessionId: string; markedCount: string }>();

    return new Map(
      rows.map((row) => [normalizeUuid(row.sessionId), Number(row.markedCount)] as const),
    );
  }

  async upsertRecordsForSession(
    rawSessionId: string,
    records: readonly UpsertAttendanceRecordInput[],
    options?: { readonly entityManager?: EntityManager },
  ): Promise<AttendanceRecordSnapshot[]> {
    assertNoDuplicateEnrollmentIds(records.map((record) => record.enrollmentId));

    const sessionId = normalizeUuid(rawSessionId);
    const run = async (manager: EntityManager): Promise<AttendanceRecordSnapshot[]> => {
      const sessionRepository = manager.getRepository(ClassSessionEntity);
      const rosterRepository = manager.getRepository(ClassSessionRosterEntity);
      const attendanceRepository = manager.getRepository(AttendanceRecordEntity);

      const session = await sessionRepository.findOne({ where: { id: sessionId } });

      if (session === null || !isAttendanceWritable(session.status)) {
        throw new AttendanceAlreadyFinalizedError();
      }

      if (records.length === 0) {
        return [];
      }

      const enrollmentIds = records.map((record) => normalizeUuid(record.enrollmentId));
      const rosterRows = await rosterRepository.find({
        where: {
          sessionId,
          enrollmentId: In(enrollmentIds),
        },
      });
      const rosterByEnrollmentId = new Map(
        rosterRows.map((row) => [normalizeUuid(row.enrollmentId), row] as const),
      );

      const now = new Date();
      const results: AttendanceRecordSnapshot[] = [];

      for (const record of records) {
        const enrollmentId = normalizeUuid(record.enrollmentId);
        const rosterEntry = rosterByEnrollmentId.get(enrollmentId);

        if (rosterEntry === undefined) {
          throw new AttendanceEnrollmentNotInSessionRosterError();
        }

        const status = parseAttendanceStatus(String(record.status));
        const note = normalizeAttendanceNote(record.note);
        const studentId = normalizeUuid(rosterEntry.studentId);
        const markedByUserId = normalizeUuid(record.markedByUserId);

        let existing = await attendanceRepository.findOne({
          where: { sessionId, enrollmentId },
        });

        if (existing === null) {
          existing = attendanceRepository.create({
            sessionId,
            enrollmentId,
            studentId,
            status,
            note,
            markedByUserId,
            markedAt: now,
            updatedByUserId: null,
          });
        } else {
          existing.status = status;
          existing.note = note;
          existing.studentId = studentId;
          existing.markedByUserId = markedByUserId;
          existing.markedAt = now;
          existing.updatedByUserId = markedByUserId;
        }

        const saved = await attendanceRepository.save(existing);
        results.push(toAttendanceRecordSnapshot(saved));
      }

      return results;
    };

    if (options?.entityManager !== undefined) {
      return run(options.entityManager);
    }

    return this.attendanceRepository.manager.transaction(run);
  }

  async getEnrollmentAttendanceSummary(
    rawEnrollmentId: string,
  ): Promise<AttendanceEnrollmentSummary> {
    const enrollmentId = normalizeUuid(rawEnrollmentId);

    const rosterRows = await this.rosterRepository.find({
      where: { enrollmentId },
    });

    if (rosterRows.length === 0) {
      return toAttendanceEnrollmentSummary({
        enrollmentId,
        totalSessions: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        unmarkedCount: 0,
      });
    }

    const sessionIds = [...new Set(rosterRows.map((row) => normalizeUuid(row.sessionId)))];
    const completedSessions = await this.classSessionRepository.find({
      where: {
        id: In(sessionIds),
        status: ClassSessionStatus.Completed,
      },
    });
    const completedSessionIds = new Set(
      completedSessions.map((session) => normalizeUuid(session.id)),
    );

    const attendanceRows = await this.attendanceRepository.find({
      where: {
        enrollmentId,
        sessionId: In([...completedSessionIds]),
      },
    });
    const attendanceBySessionId = new Map(
      attendanceRows.map((row) => [normalizeUuid(row.sessionId), row.status] as const),
    );

    const counts = {
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      unmarkedCount: 0,
    };

    for (const sessionId of completedSessionIds) {
      const status = attendanceBySessionId.get(sessionId) ?? null;
      incrementStatusCount(status, counts);
    }

    return toAttendanceEnrollmentSummary({
      enrollmentId,
      totalSessions: completedSessionIds.size,
      ...counts,
    });
  }
}
