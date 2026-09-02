export const EXAM_LIST_DEFAULT_PAGE = 1 as const;
export const EXAM_LIST_DEFAULT_LIMIT = 20 as const;
export const EXAM_LIST_MAX_LIMIT = 100 as const;

export const EXAM_SORT_FIELDS = ['code', 'createdAt', 'updatedAt'] as const;
export const EXAM_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export const EXAM_ASSIGNMENT_LIST_DEFAULT_PAGE = 1 as const;
export const EXAM_ASSIGNMENT_LIST_DEFAULT_LIMIT = 20 as const;
export const EXAM_ASSIGNMENT_LIST_MAX_LIMIT = 100 as const;

export const EXAM_ASSIGNMENT_SORT_FIELDS = ['opensAt', 'closesAt', 'createdAt'] as const;
