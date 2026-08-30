export const ACADEMIC_STRUCTURE_LIST_DEFAULT_PAGE = 1 as const;
export const ACADEMIC_STRUCTURE_LIST_DEFAULT_LIMIT = 20 as const;
export const ACADEMIC_STRUCTURE_LIST_MAX_LIMIT = 100 as const;

export const ACADEMIC_YEAR_SORT_FIELDS = [
  'name',
  'startDate',
  'endDate',
  'status',
  'createdAt',
] as const;

export type AcademicYearSortField = (typeof ACADEMIC_YEAR_SORT_FIELDS)[number];

export const CATECHISM_LEVEL_SORT_FIELDS = [
  'sortOrder',
  'code',
  'name',
  'status',
  'createdAt',
] as const;

export type CatechismLevelSortField = (typeof CATECHISM_LEVEL_SORT_FIELDS)[number];

export const ACADEMIC_STRUCTURE_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export type AcademicStructureSortDirection = (typeof ACADEMIC_STRUCTURE_SORT_DIRECTIONS)[number];
