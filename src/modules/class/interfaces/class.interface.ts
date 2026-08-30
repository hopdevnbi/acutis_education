import type { ClassStatus } from '../enums/class-status.enum';

export interface ClassSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly catechismLevelId: string;
  readonly code: string;
  readonly name: string;
  readonly status: ClassStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateClassInput {
  readonly academicYearId: string;
  readonly catechismLevelId: string;
  readonly code: string;
  readonly name: string;
}

export interface UpdateClassInput {
  readonly code?: string;
  readonly name?: string;
}

export interface ListClassesInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: ClassSortField;
  readonly sort: ClassSortDirection;
  readonly academicYearId?: string;
  readonly catechismLevelId?: string;
  readonly status?: ClassStatus;
  readonly search?: string;
}

export interface ListClassesResult {
  readonly items: readonly ClassSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export type ClassSortField = 'code' | 'name' | 'status' | 'createdAt';

export type ClassSortDirection = 'ASC' | 'DESC';
