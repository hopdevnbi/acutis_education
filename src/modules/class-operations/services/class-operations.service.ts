import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import {
  APPLICATION_EVENT_PUBLISHER,
  REWARD_EVENT_TYPES,
  type ApplicationEventPublisher,
} from '../../application-events';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { ClassService } from '../../class/services/class.service';
import { ENROLLMENT_LIST_MAX_LIMIT } from '../../enrollment/constants/enrollment.constants';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { StudentService } from '../../student/services/student.service';
import {
  CLASS_SESSION_LIST_DEFAULT_LIMIT,
  CLASS_SESSION_LIST_DEFAULT_PAGE,
  ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_LIMIT,
  ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_PAGE,
} from '../constants/class-operations.constants';
import { AttendanceRecordEntity } from '../entities/attendance-record.entity';
import { ClassSessionEntity } from '../entities/class-session.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  ClassSessionClassNotActiveError,
  ClassSessionNotFoundError,
  ClassSessionUpdateRequiresFieldsError,
} from '../errors/class-operations.errors';
import type {
  AttendanceEnrollmentSummary,
  AttendanceRecordSnapshot,
  EnrollmentAttendanceHistoryResult,
  UpsertAttendanceRecordInput,
} from '../interfaces/attendance.interface';
import type {
  BulkAttendanceClientRecordInput,
  ClassSessionListResult,
  ClassSessionSnapshot,
  ClassSessionWithCounts,
  CreateClassSessionInput,
  FreezeRosterEntryInput,
  ListClassSessionsByClassInput,
  SessionAttendanceItem,
  SessionAttendanceView,
  SessionRosterEntrySnapshot,
  UpdateClassSessionInput,
} from '../interfaces/class-session.interface';
import { AttendanceService } from './attendance.service';
import { ClassSessionRosterService } from './class-session-roster.service';
import { ClassSessionService } from './class-session.service';
import { assertRosterMutable } from '../utils/roster-immutability.util';

@Injectable()
export class ClassOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly classService: ClassService,
    private readonly classSessionService: ClassSessionService,
    private readonly classSessionRosterService: ClassSessionRosterService,
    private readonly attendanceService: AttendanceService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
    @Inject(APPLICATION_EVENT_PUBLISHER)
    private readonly applicationEventPublisher: ApplicationEventPublisher,
  ) {}

  getSessionById(rawSessionId: string): Promise<ClassSessionSnapshot> {
    return this.classSessionService.getSessionById(rawSessionId);
  }

  async getSessionWithCounts(rawSessionId: string): Promise<ClassSessionWithCounts> {
    const session = await this.classSessionService.getSessionById(rawSessionId);
    const rosterCount = await this.classSessionRosterService.countBySessionId(session.id);
    const markedCount = await this.attendanceService.countBySessionId(session.id);

    return {
      ...session,
      rosterCount,
      markedCount,
      unmarkedCount: Math.max(rosterCount - markedCount, 0),
    };
  }

  listSessionsByClass(input: ListClassSessionsByClassInput): Promise<ClassSessionListResult> {
    return this.classSessionService.listSessionsByClass(input);
  }

  async listSessionsByClassWithCounts(input: ListClassSessionsByClassInput): Promise<{
    items: ClassSessionWithCounts[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const result = await this.classSessionService.listSessionsByClass({
      ...input,
      page: input.page ?? CLASS_SESSION_LIST_DEFAULT_PAGE,
      limit: input.limit ?? CLASS_SESSION_LIST_DEFAULT_LIMIT,
    });

    const sessionIds = result.items.map((item) => item.id);
    const [rosterCounts, markedCounts] = await Promise.all([
      this.classSessionRosterService.countBySessionIds(sessionIds),
      this.attendanceService.countMarkedBySessionIds(sessionIds),
    ]);

    return {
      ...result,
      items: result.items.map((session) => {
        const rosterCount = rosterCounts.get(session.id) ?? 0;
        const markedCount = markedCounts.get(session.id) ?? 0;

        return {
          ...session,
          rosterCount,
          markedCount,
          unmarkedCount: Math.max(rosterCount - markedCount, 0),
        };
      }),
    };
  }

  listRosterBySessionId(rawSessionId: string): Promise<SessionRosterEntrySnapshot[]> {
    return this.classSessionRosterService.listBySessionId(rawSessionId);
  }

  listAttendanceBySessionId(rawSessionId: string): Promise<AttendanceRecordSnapshot[]> {
    return this.attendanceService.listBySessionId(rawSessionId);
  }

  listAttendanceByEnrollmentId(rawEnrollmentId: string): Promise<AttendanceRecordSnapshot[]> {
    return this.attendanceService.listByEnrollmentId(rawEnrollmentId);
  }

  listEnrollmentAttendanceHistory(input: {
    readonly enrollmentId: string;
    readonly page?: number;
    readonly limit?: number;
  }): Promise<EnrollmentAttendanceHistoryResult> {
    return this.attendanceService.listEnrollmentAttendanceHistory({
      enrollmentId: input.enrollmentId,
      page: input.page ?? ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_PAGE,
      limit: input.limit ?? ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_LIMIT,
    });
  }

  getEnrollmentAttendanceSummary(rawEnrollmentId: string): Promise<AttendanceEnrollmentSummary> {
    return this.attendanceService.getEnrollmentAttendanceSummary(rawEnrollmentId);
  }

  async createScheduledSessionForClass(input: {
    readonly classId: string;
    readonly title?: string | null;
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly createdByUserId: string;
  }): Promise<ClassSessionWithCounts> {
    const classSnapshot = await this.classService.getClassById(input.classId);

    if (classSnapshot.status !== ClassStatus.Active) {
      throw new ClassSessionClassNotActiveError();
    }

    const createInput: CreateClassSessionInput = {
      classId: classSnapshot.id,
      parishId: classSnapshot.parishId,
      academicYearId: classSnapshot.academicYearId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.createdByUserId,
    };

    const { session } = await this.createScheduledSessionWithRoster(createInput);

    return this.getSessionWithCounts(session.id);
  }

  async createScheduledSessionWithRoster(input: CreateClassSessionInput): Promise<{
    session: ClassSessionSnapshot;
    roster: SessionRosterEntrySnapshot[];
  }> {
    return this.dataSource.transaction(async (entityManager) => {
      const session = await this.classSessionService.createSession(input, entityManager);
      const rosterEntries = await this.buildActiveRosterEntries(input.classId);
      const roster = await this.classSessionRosterService.freezeInitialRoster(
        session.id,
        rosterEntries,
        entityManager,
      );

      return { session, roster };
    });
  }

  async refreshSessionRoster(rawSessionId: string): Promise<SessionRosterEntrySnapshot[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const sessionId = normalizeUuid(rawSessionId);
      const sessionRepository = entityManager.getRepository(ClassSessionEntity);
      const attendanceRepository = entityManager.getRepository(AttendanceRecordEntity);
      const sessionEntity = await sessionRepository.findOne({
        where: { id: sessionId },
      });

      if (sessionEntity === null) {
        throw new ClassSessionNotFoundError();
      }

      const attendanceCount = await attendanceRepository.count({
        where: { sessionId: sessionEntity.id },
      });

      assertRosterMutable(sessionEntity.status, attendanceCount);

      const rosterEntries = await this.buildActiveRosterEntries(sessionEntity.classId);

      return this.classSessionRosterService.replaceRoster(sessionEntity.id, rosterEntries, {
        sessionStatus: sessionEntity.status,
        attendanceCount,
        entityManager,
      });
    });
  }

  updateSession(
    rawSessionId: string,
    input: UpdateClassSessionInput & {
      readonly title?: string | null;
      readonly startsAt?: Date;
      readonly endsAt?: Date;
    },
  ): Promise<ClassSessionSnapshot> {
    if (input.title === undefined && input.startsAt === undefined && input.endsAt === undefined) {
      throw new ClassSessionUpdateRequiresFieldsError();
    }

    return this.classSessionService.updateSession(rawSessionId, input);
  }

  async completeSession(
    rawSessionId: string,
    updatedByUserId: string,
  ): Promise<ClassSessionWithCounts> {
    await this.classSessionService.transitionSession(
      rawSessionId,
      ClassSessionStatus.Completed,
      updatedByUserId,
    );

    const session = await this.classSessionService.getSessionById(rawSessionId);
    const attendance = await this.attendanceService.listBySessionId(session.id);

    for (const mark of attendance) {
      if (mark.status !== AttendanceStatus.Present && mark.status !== AttendanceStatus.Late) {
        continue;
      }

      await this.applicationEventPublisher.publishRewardEligibleEvent({
        eventId: mark.id,
        eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
        occurredAt: session.completedAt ?? new Date(),
        studentId: mark.studentId,
        enrollmentId: mark.enrollmentId,
        classId: session.classId,
        parishId: session.parishId,
        academicYearId: session.academicYearId,
        sourceId: mark.id,
        metadata: { attendanceStatus: mark.status },
      });
    }

    return this.getSessionWithCounts(rawSessionId);
  }

  async cancelSession(
    rawSessionId: string,
    updatedByUserId: string,
  ): Promise<ClassSessionWithCounts> {
    await this.classSessionService.transitionSession(
      rawSessionId,
      ClassSessionStatus.Cancelled,
      updatedByUserId,
    );

    return this.getSessionWithCounts(rawSessionId);
  }

  upsertAttendanceForSession(
    rawSessionId: string,
    records: readonly UpsertAttendanceRecordInput[],
  ): Promise<AttendanceRecordSnapshot[]> {
    return this.attendanceService.upsertRecordsForSession(rawSessionId, records);
  }

  async bulkUpsertAttendanceFromClient(
    rawSessionId: string,
    records: readonly BulkAttendanceClientRecordInput[],
    markedByUserId: string,
  ): Promise<SessionAttendanceView> {
    await this.attendanceService.upsertRecordsForSession(
      rawSessionId,
      records.map((record) => ({
        enrollmentId: record.enrollmentId,
        status: record.status,
        note: record.note,
        markedByUserId,
      })),
    );

    return this.getSessionAttendanceView(rawSessionId);
  }

  async getSessionAttendanceView(rawSessionId: string): Promise<SessionAttendanceView> {
    const session = await this.classSessionService.getSessionById(rawSessionId);
    const [roster, attendance] = await Promise.all([
      this.classSessionRosterService.listBySessionId(session.id),
      this.attendanceService.listBySessionId(session.id),
    ]);

    const attendanceByEnrollmentId = new Map(
      attendance.map((row) => [row.enrollmentId, row] as const),
    );

    const items: SessionAttendanceItem[] = roster
      .map((entry) => {
        const mark = attendanceByEnrollmentId.get(entry.enrollmentId);

        return {
          enrollmentId: entry.enrollmentId,
          studentId: entry.studentId,
          displayName: entry.displayNameSnapshot,
          status: mark?.status ?? null,
          note: mark?.note ?? null,
          markedAt: mark?.markedAt ?? null,
        };
      })
      .sort((left, right) => {
        const byName = left.displayName.localeCompare(right.displayName);
        if (byName !== 0) {
          return byName;
        }

        return left.enrollmentId.localeCompare(right.enrollmentId);
      });

    const markedCount = items.filter((item) => item.status !== null).length;

    return {
      session,
      rosterCount: items.length,
      markedCount,
      unmarkedCount: Math.max(items.length - markedCount, 0),
      items,
    };
  }

  private async buildActiveRosterEntries(rawClassId: string): Promise<FreezeRosterEntryInput[]> {
    const enrollments: Array<{ id: string; studentId: string }> = [];
    let page = 1;
    let totalPages = 1;

    do {
      const pageResult = await this.enrollmentService.listEnrollmentsByClass(rawClassId, {
        page,
        limit: ENROLLMENT_LIST_MAX_LIMIT,
        sortBy: 'enrolledAt',
        sort: 'ASC',
        status: EnrollmentStatus.Active,
      });

      totalPages = pageResult.totalPages === 0 ? 0 : pageResult.totalPages;
      enrollments.push(...pageResult.items);
      page += 1;
    } while (totalPages > 0 && page <= totalPages);

    if (enrollments.length === 0) {
      return [];
    }

    const students = await this.studentService.getStudentSnapshotsByIds(
      enrollments.map((enrollment) => enrollment.studentId),
    );
    const fullNameByStudentId = new Map(
      students.map((student) => [student.id, student.fullName] as const),
    );

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      displayNameSnapshot: fullNameByStudentId.get(enrollment.studentId) ?? '',
    }));
  }
}
