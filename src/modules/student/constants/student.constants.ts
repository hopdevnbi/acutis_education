export const STUDENT_FULL_NAME_MAX_LENGTH = 128;

export const STUDENT_LIST_DEFAULT_PAGE = 1 as const;
export const STUDENT_LIST_DEFAULT_LIMIT = 20 as const;
export const STUDENT_LIST_MAX_LIMIT = 100 as const;

export const STUDENT_SORT_FIELDS = ['fullName', 'status', 'createdAt'] as const;

export const STUDENT_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export const STUDENT_READ_PERMISSION = 'students.read' as const;
export const STUDENT_MANAGE_PERMISSION = 'students.manage' as const;

export const STUDENT_GUARDIAN_READ_PERMISSION = 'student-guardians.read' as const;
export const STUDENT_GUARDIAN_MANAGE_PERMISSION = 'student-guardians.manage' as const;

export const GUARDIAN_LINK_LIST_DEFAULT_PAGE = 1 as const;
export const GUARDIAN_LINK_LIST_DEFAULT_LIMIT = 20 as const;
export const GUARDIAN_LINK_LIST_MAX_LIMIT = 100 as const;
