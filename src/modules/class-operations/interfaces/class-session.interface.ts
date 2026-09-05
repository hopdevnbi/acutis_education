import type { ClassSessionStatus } from '../enums/class-session-status.enum';

export interface ClassSessionSnapshot {
  readonly id: string;
  readonly classId: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly title: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: ClassSessionStatus;
  readonly cancelledAt: Date | null;
  readonly completedAt: Date | null;
}

export interface SessionRosterEntrySnapshot {
  readonly sessionId: string;
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly displayNameSnapshot: string;
}

export interface CreateClassSessionInput {
  readonly classId: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly title?: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly createdByUserId: string;
}

export interface UpdateClassSessionInput {
  readonly title?: string | null;
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly updatedByUserId: string;
}

export interface ListClassSessionsByClassInput {
  readonly classId: string;
  readonly status?: ClassSessionStatus;
  readonly fromStartsAt?: Date;
  readonly toStartsAt?: Date;
  readonly page?: number;
  readonly limit?: number;
}

export interface ClassSessionListResult {
  readonly items: ClassSessionSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ClassSessionCounts {
  readonly rosterCount: number;
  readonly markedCount: number;
  readonly unmarkedCount: number;
}

export interface ClassSessionWithCounts extends ClassSessionSnapshot, ClassSessionCounts {}

export interface FreezeRosterEntryInput {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly displayNameSnapshot: string;
}

export interface SessionAttendanceItem {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly displayName: string;
  readonly status: string | null;
  readonly note: string | null;
  readonly markedAt: Date | null;
}

export interface SessionAttendanceView {
  readonly session: ClassSessionSnapshot;
  readonly rosterCount: number;
  readonly markedCount: number;
  readonly unmarkedCount: number;
  readonly items: SessionAttendanceItem[];
}

export interface BulkAttendanceClientRecordInput {
  readonly enrollmentId: string;
  readonly status: string;
  readonly note?: string | null;
}
