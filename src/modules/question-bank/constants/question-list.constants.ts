export const QUESTION_LIST_DEFAULT_PAGE = 1 as const;
export const QUESTION_LIST_DEFAULT_LIMIT = 20 as const;
export const QUESTION_LIST_MAX_LIMIT = 100 as const;

export const QUESTION_SORT_FIELDS = [
  'code',
  'status',
  'sourceLocale',
  'createdAt',
  'updatedAt',
] as const;

export const QUESTION_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export const QUESTION_TAG_SORT_FIELDS = ['code', 'name', 'status', 'createdAt'] as const;

export const QUESTION_TAG_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;
