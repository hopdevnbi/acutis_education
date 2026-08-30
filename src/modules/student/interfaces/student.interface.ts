import type { StudentStatus } from '../enums/student-status.enum';

export interface StudentSnapshot {
  readonly id: string;
  readonly userId: string | null;
  readonly fullName: string;
  readonly status: StudentStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateStudentInput {
  readonly fullName: string;
  readonly userId?: string | null;
}

export interface UpdateStudentInput {
  readonly fullName?: string;
  readonly userId?: string | null;
  readonly status?: StudentStatus;
}

export interface ListStudentsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'fullName' | 'status' | 'createdAt';
  readonly sort: 'ASC' | 'DESC';
  readonly status?: StudentStatus;
  readonly search?: string;
  readonly studentIds?: readonly string[];
}

export interface ListStudentsResult {
  readonly items: StudentSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
