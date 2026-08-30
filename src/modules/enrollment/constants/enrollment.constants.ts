export const ENROLLMENT_LIST_DEFAULT_PAGE = 1 as const;
export const ENROLLMENT_LIST_DEFAULT_LIMIT = 20 as const;
export const ENROLLMENT_LIST_MAX_LIMIT = 100 as const;

export const ENROLLMENT_SORT_FIELDS = ['enrolledAt', 'status', 'createdAt'] as const;
export const ENROLLMENT_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export const ENROLLMENT_READ_PERMISSION = 'enrollments.read' as const;
export const ENROLLMENT_MANAGE_PERMISSION = 'enrollments.manage' as const;
