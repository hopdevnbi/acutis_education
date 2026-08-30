export interface ListParishEnrollmentStudentsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'fullName' | 'createdAt';
  readonly sort: 'ASC' | 'DESC';
  readonly academicYearId?: string;
  readonly search?: string;
}

export interface ListParishEnrollmentStudentsResult {
  readonly studentIds: string[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
