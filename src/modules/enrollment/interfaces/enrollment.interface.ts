import type { EnrollmentStatus } from '../enums/enrollment-status.enum';

export interface EnrollmentSnapshot {
  readonly id: string;
  readonly studentId: string;
  readonly classId: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly status: EnrollmentStatus;
  readonly enrolledAt: Date;
  readonly leftAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ListEnrollmentsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'enrolledAt' | 'status' | 'createdAt';
  readonly sort: 'ASC' | 'DESC';
  readonly status?: EnrollmentStatus;
}

export interface ListEnrollmentsResult {
  readonly items: EnrollmentSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface TransferEnrollmentInput {
  readonly targetClassId: string;
}
