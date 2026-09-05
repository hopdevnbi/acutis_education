import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionStatus } from '../enums/class-session-status.enum';
import type { EnrollmentAttendanceHistoryItem } from '../interfaces/attendance.interface';
import {
  toLearnerAttendanceHistoryItemDto,
  toStaffAttendanceHistoryItemDto,
} from './class-operations-response.mapper';

describe('class-operations-response.mapper attendance history', () => {
  const item: EnrollmentAttendanceHistoryItem = {
    sessionId: '11111111-1111-4111-8111-111111111111',
    classId: '22222222-2222-4222-8222-222222222222',
    title: 'Week 1',
    startsAt: new Date('2026-09-01T01:00:00.000Z'),
    endsAt: new Date('2026-09-01T02:00:00.000Z'),
    sessionStatus: ClassSessionStatus.Completed,
    attendanceStatus: AttendanceStatus.Present,
    note: 'private staff note',
    markedAt: new Date('2026-09-01T01:30:00.000Z'),
  };

  it('staff mapper includes note and never exposes audit actor ids', () => {
    const dto = toStaffAttendanceHistoryItemDto(item);

    expect(dto.note).toBe('private staff note');
    expect(dto).not.toHaveProperty('markedByUserId');
    expect(dto).not.toHaveProperty('updatedByUserId');
    expect(dto).not.toHaveProperty('createdByUserId');
  });

  it('learner-safe mapper omits note and audit actor ids', () => {
    const dto = toLearnerAttendanceHistoryItemDto(item);

    expect(dto).not.toHaveProperty('note');
    expect(dto.attendanceStatus).toBe(AttendanceStatus.Present);
    expect(dto).not.toHaveProperty('markedByUserId');
    expect(dto).not.toHaveProperty('updatedByUserId');
    expect(dto).not.toHaveProperty('createdByUserId');
  });

  it('preserves nullable attendanceStatus for UNMARKED', () => {
    const unmarked: EnrollmentAttendanceHistoryItem = {
      ...item,
      attendanceStatus: null,
      note: null,
      markedAt: null,
    };

    expect(toStaffAttendanceHistoryItemDto(unmarked).attendanceStatus).toBeNull();
    expect(toLearnerAttendanceHistoryItemDto(unmarked).attendanceStatus).toBeNull();
  });
});
