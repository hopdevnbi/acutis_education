import { ClassSessionRosterImmutableError } from '../errors/class-operations.errors';
import { isRosterRefreshAllowed } from './class-session-lifecycle.util';
import type { ClassSessionStatus } from '../enums/class-session-status.enum';

export function assertRosterMutable(status: ClassSessionStatus, attendanceCount: number): void {
  if (!isRosterRefreshAllowed(status, attendanceCount)) {
    throw new ClassSessionRosterImmutableError();
  }
}
