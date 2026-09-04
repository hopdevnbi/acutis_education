import { ClassSessionStatus } from '../enums/class-session-status.enum';
import {
  ClassSessionNotEditableError,
  InvalidClassSessionTransitionError,
} from '../errors/class-operations.errors';
import {
  assertClassSessionEditable,
  assertClassSessionTransition,
  isAttendanceWritable,
  isRosterRefreshAllowed,
} from './class-session-lifecycle.util';

describe('class-session-lifecycle.util', () => {
  it('allows edits and attendance only while SCHEDULED', () => {
    expect(() => assertClassSessionEditable(ClassSessionStatus.Scheduled)).not.toThrow();
    expect(() => assertClassSessionEditable(ClassSessionStatus.Completed)).toThrow(
      ClassSessionNotEditableError,
    );
    expect(isAttendanceWritable(ClassSessionStatus.Scheduled)).toBe(true);
    expect(isAttendanceWritable(ClassSessionStatus.Completed)).toBe(false);
    expect(isAttendanceWritable(ClassSessionStatus.Cancelled)).toBe(false);
  });

  it('allows SCHEDULED to COMPLETED or CANCELLED only', () => {
    expect(() =>
      assertClassSessionTransition(ClassSessionStatus.Scheduled, ClassSessionStatus.Completed),
    ).not.toThrow();
    expect(() =>
      assertClassSessionTransition(ClassSessionStatus.Scheduled, ClassSessionStatus.Cancelled),
    ).not.toThrow();
    expect(() =>
      assertClassSessionTransition(ClassSessionStatus.Completed, ClassSessionStatus.Cancelled),
    ).toThrow(InvalidClassSessionTransitionError);
    expect(() =>
      assertClassSessionTransition(ClassSessionStatus.Scheduled, ClassSessionStatus.Scheduled),
    ).toThrow(InvalidClassSessionTransitionError);
  });

  it('allows roster refresh only while SCHEDULED with zero attendance marks', () => {
    expect(isRosterRefreshAllowed(ClassSessionStatus.Scheduled, 0)).toBe(true);
    expect(isRosterRefreshAllowed(ClassSessionStatus.Scheduled, 1)).toBe(false);
    expect(isRosterRefreshAllowed(ClassSessionStatus.Completed, 0)).toBe(false);
  });
});
