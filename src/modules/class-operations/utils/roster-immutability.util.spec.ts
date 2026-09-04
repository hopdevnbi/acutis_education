import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionRosterImmutableError } from '../errors/class-operations.errors';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import { assertRosterMutable } from './roster-immutability.util';

describe('roster-immutability.util', () => {
  it('throws when roster is immutable', () => {
    expect(() => assertRosterMutable(ClassSessionStatus.Scheduled, 0)).not.toThrow();
    expect(() => assertRosterMutable(ClassSessionStatus.Scheduled, 2)).toThrow(
      ClassSessionRosterImmutableError,
    );
    expect(() => assertRosterMutable(ClassSessionStatus.Cancelled, 0)).toThrow(
      ClassSessionRosterImmutableError,
    );
  });

  it('does not treat UNMARKED as a persisted attendance status', () => {
    expect(Object.values(AttendanceStatus)).not.toContain('UNMARKED');
  });
});
