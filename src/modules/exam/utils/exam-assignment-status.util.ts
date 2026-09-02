import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';

export function resolveExamAssignmentEffectiveStatus(
  storedStatus: ExamAssignmentStatus,
  opensAt: Date,
  closesAt: Date,
  now: Date = new Date(),
): ExamAssignmentStatus {
  if (storedStatus === ExamAssignmentStatus.Cancelled) {
    return ExamAssignmentStatus.Cancelled;
  }

  if (now.getTime() < opensAt.getTime()) {
    return ExamAssignmentStatus.Scheduled;
  }

  if (now.getTime() > closesAt.getTime()) {
    return ExamAssignmentStatus.Closed;
  }

  return ExamAssignmentStatus.Open;
}

export function resolveInitialExamAssignmentStatus(
  opensAt: Date,
  closesAt: Date,
  now: Date = new Date(),
): ExamAssignmentStatus {
  return resolveExamAssignmentEffectiveStatus(
    ExamAssignmentStatus.Scheduled,
    opensAt,
    closesAt,
    now,
  );
}
