import type { CatechismLevelStatus } from '../enums/catechism-level-status.enum';

export interface CatechismLevelSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly status: CatechismLevelStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCatechismLevelInput {
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface UpdateCatechismLevelInput {
  readonly code?: string;
  readonly name?: string;
  readonly sortOrder?: number;
}

export interface ListCatechismLevelsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'sortOrder' | 'code' | 'name' | 'status' | 'createdAt';
  readonly sort: 'ASC' | 'DESC';
  readonly status?: CatechismLevelStatus;
  readonly search?: string;
}

export interface ListCatechismLevelsResult {
  readonly items: readonly CatechismLevelSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
