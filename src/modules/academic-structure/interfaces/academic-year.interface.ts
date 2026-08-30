import type { AcademicYearStatus } from '../enums/academic-year-status.enum';

export interface AcademicYearSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: AcademicYearStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAcademicYearInput {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface UpdateAcademicYearInput {
  readonly name?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface ListAcademicYearsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'name' | 'startDate' | 'endDate' | 'status' | 'createdAt';
  readonly sort: 'ASC' | 'DESC';
  readonly status?: AcademicYearStatus;
  readonly search?: string;
}

export interface ListAcademicYearsResult {
  readonly items: readonly AcademicYearSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
