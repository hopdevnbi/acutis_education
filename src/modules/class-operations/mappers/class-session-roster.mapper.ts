import type { ClassSessionRosterEntity } from '../entities/class-session-roster.entity';
import type { SessionRosterEntrySnapshot } from '../interfaces/class-session.interface';

export function toSessionRosterEntrySnapshot(
  entity: ClassSessionRosterEntity,
): SessionRosterEntrySnapshot {
  return {
    sessionId: entity.sessionId,
    enrollmentId: entity.enrollmentId,
    studentId: entity.studentId,
    displayNameSnapshot: entity.displayNameSnapshot,
  };
}
