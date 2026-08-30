export const PARISH_LIST_DEFAULT_PAGE = 1 as const;
export const PARISH_LIST_DEFAULT_LIMIT = 20 as const;
export const PARISH_LIST_MAX_LIMIT = 100 as const;

export const PARISH_SORT_FIELDS = ['code', 'name', 'status', 'createdAt'] as const;

export type ParishSortField = (typeof PARISH_SORT_FIELDS)[number];

export const PARISH_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export type ParishSortDirection = (typeof PARISH_SORT_DIRECTIONS)[number];
