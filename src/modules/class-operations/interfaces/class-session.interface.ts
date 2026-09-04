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
}

export interface FreezeRosterEntryInput {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly displayNameSnapshot: string;
}
