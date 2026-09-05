export const CMS_READ_PERMISSION = 'cms.read' as const;
export const CMS_MANAGE_PERMISSION = 'cms.manage' as const;

export const CMS_PERMISSIONS = [CMS_READ_PERMISSION, CMS_MANAGE_PERMISSION] as const;

export const CMS_SLUG_MAX_LENGTH = 128 as const;
export const CMS_TITLE_MAX_LENGTH = 200 as const;
export const CMS_SUMMARY_MAX_LENGTH = 1000 as const;
export const CMS_BODY_MAX_BYTES = 65536 as const; // ~64 KB
