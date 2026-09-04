import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  ClassSessionNotEditableError,
  InvalidClassSessionTransitionError,
} from '../errors/class-operations.errors';

export function assertClassSessionEditable(status: ClassSessionStatus): void {
  if (status !== ClassSessionStatus.Scheduled) {
    throw new ClassSessionNotEditableError();
  }
}

export function assertClassSessionTransition(
  currentStatus: ClassSessionStatus,
  targetStatus: ClassSessionStatus,
): void {
  if (currentStatus !== ClassSessionStatus.Scheduled) {
    throw new InvalidClassSessionTransitionError();
  }

  if (
    targetStatus !== ClassSessionStatus.Completed &&
    targetStatus !== ClassSessionStatus.Cancelled
  ) {
    throw new InvalidClassSessionTransitionError();
  }
}

export function isAttendanceWritable(status: ClassSessionStatus): boolean {
  return status === ClassSessionStatus.Scheduled;
}

export function isRosterRefreshAllowed(
  status: ClassSessionStatus,
  attendanceCount: number,
): boolean {
  return status === ClassSessionStatus.Scheduled && attendanceCount === 0;
}
