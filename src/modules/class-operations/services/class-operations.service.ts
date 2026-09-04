import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ENROLLMENT_LIST_MAX_LIMIT } from '../../enrollment/constants/enrollment.constants';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { StudentService } from '../../student/services/student.service';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import type {
  AttendanceEnrollmentSummary,
  AttendanceRecordSnapshot,
  UpsertAttendanceRecordInput,
} from '../interfaces/attendance.interface';
import type {
  ClassSessionSnapshot,
  CreateClassSessionInput,
  FreezeRosterEntryInput,
  ListClassSessionsByClassInput,
  SessionRosterEntrySnapshot,
  UpdateClassSessionInput,
} from '../interfaces/class-session.interface';
import { AttendanceService } from './attendance.service';
import { ClassSessionRosterService } from './class-session-roster.service';
import { ClassSessionService } from './class-session.service';

@Injectable()
export class ClassOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly classSessionService: ClassSessionService,
    private readonly classSessionRosterService: ClassSessionRosterService,
    private readonly attendanceService: AttendanceService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
  ) {}

  getSessionById(rawSessionId: string): Promise<ClassSessionSnapshot> {
    return this.classSessionService.getSessionById(rawSessionId);
  }

  listSessionsByClass(input: ListClassSessionsByClassInput): Promise<ClassSessionSnapshot[]> {
    return this.classSessionService.listSessionsByClass(input);
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

  getEnrollmentAttendanceSummary(rawEnrollmentId: string): Promise<AttendanceEnrollmentSummary> {
    return this.attendanceService.getEnrollmentAttendanceSummary(rawEnrollmentId);
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
    const session = await this.classSessionService.getSessionById(rawSessionId);
    const attendanceCount = await this.attendanceService.countBySessionId(session.id);
    const rosterEntries = await this.buildActiveRosterEntries(session.classId);

    return this.classSessionRosterService.replaceRoster(session.id, rosterEntries, {
      sessionStatus: session.status,
      attendanceCount,
    });
  }

  updateSession(
    rawSessionId: string,
    input: UpdateClassSessionInput,
  ): Promise<ClassSessionSnapshot> {
    return this.classSessionService.updateSession(rawSessionId, input);
  }

  completeSession(rawSessionId: string, updatedByUserId: string): Promise<ClassSessionSnapshot> {
    return this.classSessionService.transitionSession(
      rawSessionId,
      ClassSessionStatus.Completed,
      updatedByUserId,
    );
  }

  cancelSession(rawSessionId: string, updatedByUserId: string): Promise<ClassSessionSnapshot> {
    return this.classSessionService.transitionSession(
      rawSessionId,
      ClassSessionStatus.Cancelled,
      updatedByUserId,
    );
  }

  upsertAttendanceForSession(
    rawSessionId: string,
    records: readonly UpsertAttendanceRecordInput[],
  ): Promise<AttendanceRecordSnapshot[]> {
    return this.attendanceService.upsertRecordsForSession(rawSessionId, records);
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
