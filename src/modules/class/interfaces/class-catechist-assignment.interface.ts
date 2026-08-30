import type { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';
import type { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';

export interface CatechistAssignmentSnapshot {
  readonly id: string;
  readonly classId: string;
  readonly catechistUserId: string;
  readonly assignmentRole: CatechistAssignmentRole;
  readonly status: CatechistAssignmentStatus;
  readonly assignedAt: Date;
  readonly endedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AssignCatechistInput {
  readonly catechistUserId: string;
  readonly assignmentRole: CatechistAssignmentRole;
}

export interface ListCatechistAssignmentsInput {
  readonly page: number;
  readonly limit: number;
  readonly includeEnded: boolean;
}

export interface ListCatechistAssignmentsResult {
  readonly items: CatechistAssignmentSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
