import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { ClassSessionRosterEntity } from '../entities/class-session-roster.entity';
import { ClassSessionEntity } from '../entities/class-session.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  AttendanceAlreadyFinalizedError,
  AttendanceEnrollmentNotInSessionRosterError,
} from '../errors/class-operations.errors';
import type {
  AttendanceEnrollmentSummary,
  AttendanceRecordSnapshot,
  EnrollmentAttendanceHistoryResult,
  ListEnrollmentAttendanceHistoryInput,
  UpsertAttendanceRecordInput,
} from '../interfaces/attendance.interface';
import { toAttendanceRecordSnapshot } from '../mappers/attendance-record.mapper';
import {
  assertNoDuplicateEnrollmentIds,
  normalizeAttendanceNote,
  parseAttendanceStatus,
} from '../utils/attendance-bulk-input.util';
import { toAttendanceEnrollmentSummary } from '../utils/attendance-summary.util';
import { isAttendanceWritable } from '../utils/class-session-lifecycle.util';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepository: Repository<AttendanceRecordEntity>,
    @InjectRepository(ClassSessionRosterEntity)
    private readonly rosterRepository: Repository<ClassSessionRosterEntity>,
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

    const row = await this.rosterRepository
      .createQueryBuilder('roster')
      .innerJoin(ClassSessionEntity, 'session', 'session.id = roster.sessionId')
      .leftJoin(
        AttendanceRecordEntity,
        'attendance',
        'attendance.sessionId = roster.sessionId AND attendance.enrollmentId = roster.enrollmentId',
      )
      .select('COUNT(1)', 'totalSessions')
      .addSelect(`SUM(CASE WHEN attendance.status = :present THEN 1 ELSE 0 END)`, 'presentCount')
      .addSelect(`SUM(CASE WHEN attendance.status = :late THEN 1 ELSE 0 END)`, 'lateCount')
      .addSelect(`SUM(CASE WHEN attendance.status = :absent THEN 1 ELSE 0 END)`, 'absentCount')
      .addSelect(`SUM(CASE WHEN attendance.status = :excused THEN 1 ELSE 0 END)`, 'excusedCount')
      .addSelect(`SUM(CASE WHEN attendance.status IS NULL THEN 1 ELSE 0 END)`, 'unmarkedCount')
      .where('roster.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('session.status = :completedStatus', {
        completedStatus: ClassSessionStatus.Completed,
      })
      .setParameters({
        present: AttendanceStatus.Present,
        late: AttendanceStatus.Late,
        absent: AttendanceStatus.Absent,
        excused: AttendanceStatus.Excused,
      })
      .getRawOne<{
        totalSessions: string | number | null;
        presentCount: string | number | null;
        lateCount: string | number | null;
        absentCount: string | number | null;
        excusedCount: string | number | null;
        unmarkedCount: string | number | null;
      }>();

    const toCount = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) {
        return 0;
      }

      return Number(value);
    };

    return toAttendanceEnrollmentSummary({
      enrollmentId,
      totalSessions: toCount(row?.totalSessions),
      presentCount: toCount(row?.presentCount),
      lateCount: toCount(row?.lateCount),
      absentCount: toCount(row?.absentCount),
      excusedCount: toCount(row?.excusedCount),
      unmarkedCount: toCount(row?.unmarkedCount),
    });
  }

  async listEnrollmentAttendanceHistory(
    input: ListEnrollmentAttendanceHistoryInput,
  ): Promise<EnrollmentAttendanceHistoryResult> {
    const enrollmentId = normalizeUuid(input.enrollmentId);
    const page = input.page;
    const limit = input.limit;

    const baseQuery = this.rosterRepository
      .createQueryBuilder('roster')
      .innerJoin(ClassSessionEntity, 'session', 'session.id = roster.sessionId')
      .leftJoin(
        AttendanceRecordEntity,
        'attendance',
        'attendance.sessionId = roster.sessionId AND attendance.enrollmentId = roster.enrollmentId',
      )
      .where('roster.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('session.status = :completedStatus', {
        completedStatus: ClassSessionStatus.Completed,
      });

    const total = await baseQuery.clone().getCount();

    const rows = await baseQuery
      .select('session.id', 'sessionId')
      .addSelect('session.classId', 'classId')
      .addSelect('session.title', 'title')
      .addSelect('session.startsAt', 'startsAt')
      .addSelect('session.endsAt', 'endsAt')
      .addSelect('session.status', 'sessionStatus')
      .addSelect('attendance.status', 'attendanceStatus')
      .addSelect('attendance.note', 'note')
      .addSelect('attendance.markedAt', 'markedAt')
      .orderBy('session.startsAt', 'DESC')
      .addOrderBy('session.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        sessionId: string;
        classId: string;
        title: string | null;
        startsAt: Date;
        endsAt: Date;
        sessionStatus: string;
        attendanceStatus: AttendanceStatus | null;
        note: string | null;
        markedAt: Date | null;
      }>();

    return {
      enrollmentId,
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items: rows.map((row) => ({
        sessionId: normalizeUuid(row.sessionId),
        classId: normalizeUuid(row.classId),
        title: row.title,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        sessionStatus: row.sessionStatus,
        attendanceStatus: row.attendanceStatus ?? null,
        note: row.note ?? null,
        markedAt: row.markedAt ?? null,
      })),
    };
  }
}
