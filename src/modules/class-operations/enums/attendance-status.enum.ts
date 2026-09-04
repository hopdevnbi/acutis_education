export enum AttendanceStatus {
  Present = 'PRESENT',
  Absent = 'ABSENT',
  Late = 'LATE',
  Excused = 'EXCUSED',
}

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  AttendanceStatus.Present,
  AttendanceStatus.Absent,
  AttendanceStatus.Late,
  AttendanceStatus.Excused,
] as const;
