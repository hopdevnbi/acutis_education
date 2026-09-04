import { ATTENDANCE_STATUSES, AttendanceStatus } from '../enums/attendance-status.enum';
import {
  DuplicateAttendanceEnrollmentInputError,
  InvalidAttendanceNoteError,
  InvalidAttendanceStatusError,
} from '../errors/class-operations.errors';
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../constants/class-operations.constants';
import { normalizeUuid } from '../../../database/uuid-v4.util';

export function assertNoDuplicateEnrollmentIds(enrollmentIds: readonly string[]): void {
  const seen = new Set<string>();

  for (const rawEnrollmentId of enrollmentIds) {
    const enrollmentId = normalizeUuid(rawEnrollmentId);

    if (seen.has(enrollmentId)) {
      throw new DuplicateAttendanceEnrollmentInputError();
    }

    seen.add(enrollmentId);
  }
}

export function parseAttendanceStatus(rawStatus: string): AttendanceStatus {
  if ((ATTENDANCE_STATUSES as readonly string[]).includes(rawStatus)) {
    return rawStatus as AttendanceStatus;
  }

  throw new InvalidAttendanceStatusError();
}

export function normalizeAttendanceNote(rawNote: string | null | undefined): string | null {
  if (rawNote === undefined || rawNote === null) {
    return null;
  }

  const trimmed = rawNote.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > ATTENDANCE_NOTE_MAX_LENGTH) {
    throw new InvalidAttendanceNoteError();
  }

  return trimmed;
}
